package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/bonjuruu/aporia/internal/db"
	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/middleware"
	"github.com/bonjuruu/aporia/internal/server"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var (
	testRouter    *gin.Engine
	testDriver    neo4j.DriverWithContext
	testNeo4jKit  neo4j_kit.Neo4jKit
	testJWTSecret = []byte("e2e-test-secret-key-at-least-32-chars!!")
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)

	uri := envOrDefault("NEO4J_URI", "bolt://localhost:7687")
	username := envOrDefault("NEO4J_USERNAME", "neo4j")
	password := envOrDefault("NEO4J_PASSWORD", "password")

	var newDriverErr error
	testDriver, newDriverErr = db.NewDriver(uri, username, password)
	if newDriverErr != nil {
		panic("failed to connect to Neo4j: " + newDriverErr.Error())
	}

	testNeo4jKit = neo4j_kit.NewNeo4jKit(testDriver)

	if runMigrationsErr := db.RunMigrations(testDriver, "../migrations"); runMigrationsErr != nil {
		panic("failed to run migrations: " + runMigrationsErr.Error())
	}

	cookieConfig := middleware.CookieConfig{Secure: false}
	handlers := server.WireHandlers(testDriver, testJWTSecret, cookieConfig)
	testRouter = server.NewRouter(handlers, testJWTSecret, "http://localhost:5173")

	code := m.Run()

	_ = testDriver.Close(context.Background())
	os.Exit(code)
}

func envOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func cleanDB(t *testing.T) {
	t.Helper()
	ctx := context.Background()
	session := testDriver.NewSession(ctx, neo4j.SessionConfig{})
	defer func() { _ = session.Close(ctx) }()

	result, runErr := session.Run(ctx, "MATCH (n) DETACH DELETE n", nil)
	if runErr != nil {
		t.Fatalf("failed to clean database: %v", runErr)
	}
	if _, consumeErr := result.Consume(ctx); consumeErr != nil {
		t.Fatalf("failed to consume clean database result: %v", consumeErr)
	}
}

// authCookies holds the cookies returned by register/login for use in subsequent requests.
type authCookies struct {
	tokenCookie *http.Cookie
	csrfCookie  *http.Cookie
}

func registerAndLogin(t *testing.T, email, password string) authCookies {
	t.Helper()

	registerBody, registerMarshalErr := json.Marshal(map[string]string{"email": email, "password": password})
	require.NoError(t, registerMarshalErr)

	registerRequest := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(registerBody))
	registerRequest.Header.Set("Content-Type", "application/json")
	registerRecorder := httptest.NewRecorder()
	testRouter.ServeHTTP(registerRecorder, registerRequest)
	require.Equal(t, http.StatusCreated, registerRecorder.Code, "failed to register user: %s", registerRecorder.Body.String())

	return extractAuthCookies(t, registerRecorder)
}

func extractAuthCookies(t *testing.T, recorder *httptest.ResponseRecorder) authCookies {
	t.Helper()
	cookieList := recorder.Result().Cookies()
	var result authCookies
	for _, cookie := range cookieList {
		switch cookie.Name {
		case middleware.AuthCookieName:
			result.tokenCookie = cookie
		case middleware.CSRFCookieName:
			result.csrfCookie = cookie
		}
	}
	require.NotNil(t, result.tokenCookie, "auth cookie not found in response")
	require.NotNil(t, result.csrfCookie, "CSRF cookie not found in response")
	return result
}

// doRequest sends an authenticated request using cookies and unmarshals the response into dest.
// Pass nil for body on GET/DELETE. Pass nil for dest if you don't need the response body.
func doRequest(t *testing.T, method, path string, body any, auth authCookies, expectedStatus int, dest any) *httptest.ResponseRecorder {
	t.Helper()

	reqBody := &bytes.Buffer{}
	if body != nil {
		bodyBytes, marshalErr := json.Marshal(body)
		require.NoError(t, marshalErr)
		reqBody = bytes.NewBuffer(bodyBytes)
	}

	request := httptest.NewRequest(method, path, reqBody)
	request.Header.Set("Content-Type", "application/json")
	if auth.tokenCookie != nil {
		request.AddCookie(auth.tokenCookie)
	}
	if auth.csrfCookie != nil {
		request.AddCookie(auth.csrfCookie)
	}
	// Add CSRF header for state-changing methods
	if method != http.MethodGet && method != http.MethodHead && auth.csrfCookie != nil {
		request.Header.Set(middleware.CSRFHeaderName, auth.csrfCookie.Value)
	}
	recorder := httptest.NewRecorder()

	testRouter.ServeHTTP(recorder, request)
	require.Equal(t, expectedStatus, recorder.Code, "unexpected status for %s %s: %s", method, path, recorder.Body.String())

	if dest != nil {
		require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), dest))
	}

	return recorder
}

// doUnauthenticatedRequest sends a request without cookies (for testing public endpoints and auth errors).
func doUnauthenticatedRequest(t *testing.T, method, path string, body any, expectedStatus int, dest any) *httptest.ResponseRecorder {
	t.Helper()
	return doRequest(t, method, path, body, authCookies{}, expectedStatus, dest)
}
