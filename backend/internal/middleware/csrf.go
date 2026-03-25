package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/bonjuruu/aporia/internal/response"
	"github.com/gin-gonic/gin"
)

func CSRF() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodGet ||
			c.Request.Method == http.MethodHead ||
			c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// CSRF protection only applies to cookie-based auth. Bearer tokens are
		// explicitly attached by the client and are not vulnerable to CSRF.
		if method, _ := c.Get(AuthMethodKey); method == "bearer" {
			c.Next()
			return
		}

		csrfCookie, cookieErr := c.Cookie(CSRFCookieName)
		if cookieErr != nil || csrfCookie == "" {
			response.Abort(c, http.StatusForbidden, "missing CSRF token")
			return
		}

		csrfHeader := c.GetHeader(CSRFHeaderName)
		if csrfHeader == "" || subtle.ConstantTimeCompare([]byte(csrfHeader), []byte(csrfCookie)) != 1 {
			response.Abort(c, http.StatusForbidden, "CSRF token mismatch")
			return
		}

		c.Next()
	}
}
