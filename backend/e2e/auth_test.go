package e2e

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bonjuruu/aporia/internal/middleware"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthJourney(t *testing.T) {
	cleanDB(t)

	// Register a new user — sets httpOnly cookies
	registerBody, _ := json.Marshal(map[string]string{"email": "plato@academy.gr", "password": "password123"})
	registerRequest := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(registerBody))
	registerRequest.Header.Set("Content-Type", "application/json")
	registerRecorder := httptest.NewRecorder()
	testRouter.ServeHTTP(registerRecorder, registerRequest)
	require.Equal(t, http.StatusCreated, registerRecorder.Code)

	// Verify cookies are set
	registerAuth := extractAuthCookies(t, registerRecorder)
	assert.NotEmpty(t, registerAuth.tokenCookie.Value)
	assert.True(t, registerAuth.tokenCookie.HttpOnly, "auth cookie should be httpOnly")
	assert.False(t, registerAuth.csrfCookie.HttpOnly, "CSRF cookie should be readable by JS")

	// Verify response body is a status message, not a token
	var registerStatus response.StatusResponse
	require.NoError(t, json.Unmarshal(registerRecorder.Body.Bytes(), &registerStatus))
	assert.Equal(t, "registered", registerStatus.Status)

	// Verify the cookie works immediately (auto-login)
	var registeredUser models.User
	doRequest(t, http.MethodGet, "/api/auth/me", nil, registerAuth, http.StatusOK, &registeredUser)
	assert.Equal(t, "plato@academy.gr", registeredUser.Email)
	assert.NotEmpty(t, registeredUser.ID)

	// Duplicate registration fails
	doUnauthenticatedRequest(t, http.MethodPost, "/api/auth/register",
		map[string]string{"email": "plato@academy.gr", "password": "password123"},
		http.StatusConflict, nil)

	// Login with correct credentials
	loginBody, _ := json.Marshal(map[string]string{"email": "plato@academy.gr", "password": "password123"})
	loginRequest := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginBody))
	loginRequest.Header.Set("Content-Type", "application/json")
	loginRecorder := httptest.NewRecorder()
	testRouter.ServeHTTP(loginRecorder, loginRequest)
	require.Equal(t, http.StatusOK, loginRecorder.Code)

	loginAuth := extractAuthCookies(t, loginRecorder)
	assert.NotEmpty(t, loginAuth.tokenCookie.Value)

	// Login with wrong password fails
	doUnauthenticatedRequest(t, http.MethodPost, "/api/auth/login",
		map[string]string{"email": "plato@academy.gr", "password": "wrong"},
		http.StatusUnauthorized, nil)

	// Accessing protected route without cookie fails
	doUnauthenticatedRequest(t, http.MethodGet, "/api/auth/me", nil, http.StatusUnauthorized, nil)

	// Get current user with valid cookies
	var me models.User
	doRequest(t, http.MethodGet, "/api/auth/me", nil, loginAuth, http.StatusOK, &me)
	assert.Equal(t, "plato@academy.gr", me.Email)
	assert.Equal(t, registeredUser.ID, me.ID)

	// CSRF protection: mutating request without CSRF header should fail
	csrfTestRequest := httptest.NewRequest(http.MethodPost, "/api/nodes", bytes.NewBuffer([]byte(`{"type":"CONCEPT","name":"Test"}`)))
	csrfTestRequest.Header.Set("Content-Type", "application/json")
	csrfTestRequest.AddCookie(loginAuth.tokenCookie)
	// Intentionally NOT setting the CSRF header
	csrfRecorder := httptest.NewRecorder()
	testRouter.ServeHTTP(csrfRecorder, csrfTestRequest)
	assert.Equal(t, http.StatusForbidden, csrfRecorder.Code, "mutating request without CSRF header should be rejected")

	// Stale cookie: valid JWT but user deleted from DB should return 401 and clear cookie
	deleteUser(t, registeredUser.ID)
	staleRecorder := doRequest(t, http.MethodGet, "/api/auth/me", nil, loginAuth, http.StatusUnauthorized, nil)
	for _, cookie := range staleRecorder.Result().Cookies() {
		if cookie.Name == middleware.AuthCookieName {
			assert.True(t, cookie.MaxAge < 0, "auth cookie should be cleared when user not found")
		}
	}

	// Re-register so we can test logout
	reRegisterAuth := registerAndLogin(t, "plato@academy.gr", "password123")

	// Logout clears cookies
	logoutRecorder := doRequest(t, http.MethodPost, "/api/auth/logout", nil, reRegisterAuth, http.StatusOK, nil)

	// Verify the Set-Cookie headers clear the auth cookie
	for _, cookie := range logoutRecorder.Result().Cookies() {
		if cookie.Name == middleware.AuthCookieName {
			assert.True(t, cookie.MaxAge < 0, "auth cookie should be expired after logout")
		}
	}
}
