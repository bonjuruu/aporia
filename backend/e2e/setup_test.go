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

	handlers := server.WireHandlers(testDriver, testJWTSecret)
	testRouter = server.NewRouter(handlers, testJWTSecret)

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

func registerAndLogin(t *testing.T, email, password string) string {
	t.Helper()

	registerBody, registerMarshalErr := json.Marshal(map[string]string{"email": email, "password": password})
	require.NoError(t, registerMarshalErr)

	registerRequest := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(registerBody))
	registerRequest.Header.Set("Content-Type", "application/json")
	registerRecorder := httptest.NewRecorder()
	testRouter.ServeHTTP(registerRecorder, registerRequest)
	require.Equal(t, http.StatusCreated, registerRecorder.Code, "failed to register user: %s", registerRecorder.Body.String())

	var tokenResponse map[string]string
	require.NoError(t, json.Unmarshal(registerRecorder.Body.Bytes(), &tokenResponse))
	return tokenResponse["token"]
}

// doRequest sends an authenticated request and unmarshals the response into dest.
// Pass nil for body on GET/DELETE. Pass nil for dest if you don't need the response body.
func doRequest(t *testing.T, method, path string, body any, token string, expectedStatus int, dest any) *httptest.ResponseRecorder {
	t.Helper()

	reqBody := &bytes.Buffer{}
	if body != nil {
		bodyBytes, marshalErr := json.Marshal(body)
		require.NoError(t, marshalErr)
		reqBody = bytes.NewBuffer(bodyBytes)
	}

	request := httptest.NewRequest(method, path, reqBody)
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	recorder := httptest.NewRecorder()

	testRouter.ServeHTTP(recorder, request)
	require.Equal(t, expectedStatus, recorder.Code, "unexpected status for %s %s: %s", method, path, recorder.Body.String())

	if dest != nil {
		require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), dest))
	}

	return recorder
}
