package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/bonjuruu/aporia/internal/response"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const AuthMethodKey = "authMethod"

func Auth(jwtSecret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenStr string
		authMethod := "cookie"

		// Primary: read from httpOnly cookie
		if cookie, cookieErr := c.Cookie(AuthCookieName); cookieErr == nil && cookie != "" {
			tokenStr = cookie
		}

		// Fallback: Authorization header (Swagger UI, API clients, tests)
		if tokenStr == "" {
			header := c.GetHeader("Authorization")
			if strings.HasPrefix(header, "Bearer ") {
				tokenStr = strings.TrimPrefix(header, "Bearer ")
				authMethod = "bearer"
			}
		}

		if tokenStr == "" {
			response.Abort(c, http.StatusUnauthorized, "missing token")
			return
		}

		token, parseErr := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
			if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, errors.New("unexpected signing method")
			}
			return jwtSecret, nil
		})

		if parseErr != nil || !token.Valid {
			response.Abort(c, http.StatusUnauthorized, "invalid token")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, "invalid claims")
			return
		}

		sub, ok := claims["sub"].(string)
		if !ok {
			response.Abort(c, http.StatusUnauthorized, "invalid subject")
			return
		}

		c.Set("userID", sub)
		c.Set(AuthMethodKey, authMethod)
		c.Next()
	}
}
