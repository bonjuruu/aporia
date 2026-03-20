package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/bonjuruu/aporia/internal/response"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func Auth(jwtSecret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			response.Abort(c, http.StatusUnauthorized, "missing token")
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		token, parseErr := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
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
		c.Next()
	}
}
