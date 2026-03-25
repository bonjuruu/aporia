package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSetAuthCookie_ShouldSetBothCookies(t *testing.T) {
	t.Parallel()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/", nil)

	cfg := CookieConfig{Secure: false}
	setCookieErr := SetAuthCookie(c, "jwt-token-value", cfg)
	require.NoError(t, setCookieErr)

	cookieList := recorder.Result().Cookies()
	require.Len(t, cookieList, 2)

	var authCookie, csrfCookie *http.Cookie
	for _, cookie := range cookieList {
		switch cookie.Name {
		case AuthCookieName:
			authCookie = cookie
		case CSRFCookieName:
			csrfCookie = cookie
		}
	}

	require.NotNil(t, authCookie, "auth cookie should be set")
	assert.Equal(t, "jwt-token-value", authCookie.Value)
	assert.True(t, authCookie.HttpOnly, "auth cookie should be httpOnly")
	assert.Equal(t, "/api", authCookie.Path)
	assert.Equal(t, cookieMaxAge, authCookie.MaxAge)

	require.NotNil(t, csrfCookie, "CSRF cookie should be set")
	assert.NotEmpty(t, csrfCookie.Value, "CSRF cookie should have a generated value")
	assert.False(t, csrfCookie.HttpOnly, "CSRF cookie should be readable by JavaScript")
	assert.Equal(t, "/", csrfCookie.Path)
	assert.Len(t, csrfCookie.Value, 32, "CSRF token should be 32 hex chars (16 bytes)")
}

func TestSetAuthCookie_ShouldSetSecureFlagWhenConfigured(t *testing.T) {
	t.Parallel()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/", nil)

	cfg := CookieConfig{Secure: true}
	setCookieErr := SetAuthCookie(c, "jwt-token-value", cfg)
	require.NoError(t, setCookieErr)

	for _, cookie := range recorder.Result().Cookies() {
		assert.True(t, cookie.Secure, "cookie %s should have Secure flag", cookie.Name)
	}
}

func TestClearAuthCookie_ShouldExpireBothCookies(t *testing.T) {
	t.Parallel()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/", nil)

	cfg := CookieConfig{Secure: false}
	ClearAuthCookie(c, cfg)

	cookieList := recorder.Result().Cookies()
	require.Len(t, cookieList, 2)

	for _, cookie := range cookieList {
		assert.True(t, cookie.MaxAge < 0, "cookie %s should be expired (MaxAge < 0)", cookie.Name)
		assert.Empty(t, cookie.Value, "cookie %s should have empty value", cookie.Name)
	}
}

func TestGenerateCSRFToken_ShouldReturnUniqueTokens(t *testing.T) {
	t.Parallel()

	tokenA, tokenAErr := generateCSRFToken()
	tokenB, tokenBErr := generateCSRFToken()

	require.NoError(t, tokenAErr)
	require.NoError(t, tokenBErr)
	assert.Len(t, tokenA, 32, "CSRF token should be 32 hex chars")
	assert.NotEqual(t, tokenA, tokenB, "consecutive tokens should be unique")
}
