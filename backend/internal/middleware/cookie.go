package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	AuthCookieName = "aporia_token"
	CSRFCookieName = "aporia_csrf"
	CSRFHeaderName = "X-CSRF-Token"
	cookieMaxAge   = 7 * 24 * 60 * 60 // 7 days
)

type CookieConfig struct {
	Secure bool
}

func SetAuthCookie(c *gin.Context, token string, cfg CookieConfig) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(AuthCookieName, token, cookieMaxAge, "/api", "", cfg.Secure, true)

	csrfToken := generateCSRFToken()
	c.SetCookie(CSRFCookieName, csrfToken, cookieMaxAge, "/", "", cfg.Secure, false)
}

func ClearAuthCookie(c *gin.Context, cfg CookieConfig) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(AuthCookieName, "", -1, "/api", "", cfg.Secure, true)
	c.SetCookie(CSRFCookieName, "", -1, "/", "", cfg.Secure, false)
}

func generateCSRFToken() string {
	b := make([]byte, 16)
	if _, readErr := rand.Read(b); readErr != nil {
		panic("failed to generate CSRF token: " + readErr.Error())
	}
	return hex.EncodeToString(b)
}
