package api

import (
	"net/http"

	"github.com/bonjuruu/aporia/internal/response"
	"github.com/gin-gonic/gin"
)

// requireUserID extracts the authenticated user ID from the Gin context.
// Returns the user ID and true on success, or aborts with 401 and returns false.
func requireUserID(c *gin.Context) (string, bool) {
	raw, exists := c.Get("userID")
	if !exists {
		response.Abort(c, http.StatusUnauthorized, "not authenticated")
		return "", false
	}
	userID, ok := raw.(string)
	if !ok {
		response.Abort(c, http.StatusUnauthorized, "invalid user context")
		return "", false
	}
	return userID, true
}
