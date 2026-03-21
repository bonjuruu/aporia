package e2e

import (
	"net/http"
	"testing"

	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/stretchr/testify/assert"
)

func TestAuthJourney(t *testing.T) {
	cleanDB(t)

	// Register a new user — returns a token
	var registerResponse response.TokenResponse
	doRequest(t, http.MethodPost, "/api/auth/register",
		map[string]string{"email": "plato@academy.gr", "password": "password123"},
		"", http.StatusCreated, &registerResponse)
	assert.NotEmpty(t, registerResponse.Token)

	// Verify the token works immediately (auto-login)
	var registeredUser models.User
	doRequest(t, http.MethodGet, "/api/auth/me", nil, registerResponse.Token, http.StatusOK, &registeredUser)
	assert.Equal(t, "plato@academy.gr", registeredUser.Email)
	assert.NotEmpty(t, registeredUser.ID)

	// Duplicate registration fails
	doRequest(t, http.MethodPost, "/api/auth/register",
		map[string]string{"email": "plato@academy.gr", "password": "password123"},
		"", http.StatusConflict, nil)

	// Login with correct credentials
	var tokenResponse response.TokenResponse
	doRequest(t, http.MethodPost, "/api/auth/login",
		map[string]string{"email": "plato@academy.gr", "password": "password123"},
		"", http.StatusOK, &tokenResponse)
	assert.NotEmpty(t, tokenResponse.Token)

	// Login with wrong password fails
	doRequest(t, http.MethodPost, "/api/auth/login",
		map[string]string{"email": "plato@academy.gr", "password": "wrong"},
		"", http.StatusUnauthorized, nil)

	// Accessing protected route without token fails
	doRequest(t, http.MethodGet, "/api/auth/me", nil, "", http.StatusUnauthorized, nil)

	// Get current user with valid token
	var me models.User
	doRequest(t, http.MethodGet, "/api/auth/me", nil, tokenResponse.Token, http.StatusOK, &me)
	assert.Equal(t, "plato@academy.gr", me.Email)
	assert.Equal(t, registeredUser.ID, me.ID)
}
