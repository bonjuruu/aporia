package middleware

import (
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

		csrfCookie, cookieErr := c.Cookie(CSRFCookieName)
		if cookieErr != nil || csrfCookie == "" {
			response.Abort(c, http.StatusForbidden, "missing CSRF token")
			return
		}

		csrfHeader := c.GetHeader(CSRFHeaderName)
		if csrfHeader == "" || csrfHeader != csrfCookie {
			response.Abort(c, http.StatusForbidden, "CSRF token mismatch")
			return
		}

		c.Next()
	}
}
