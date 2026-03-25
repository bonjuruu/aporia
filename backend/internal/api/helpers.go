package api

import (
	"net/http"

	"github.com/bonjuruu/aporia/internal/response"
	"github.com/gin-gonic/gin"
)

// requireUserID extracts the authenticated user ID from the Gin context.
// Returns the user ID and true on success, or writes a 401 response and returns false.
func requireUserID(c *gin.Context) (string, bool) {
	raw, exists := c.Get("userID")
	if !exists {
		response.RespondError(c, http.StatusUnauthorized, "not authenticated")
		return "", false
	}
	userID, ok := raw.(string)
	if !ok {
		response.RespondError(c, http.StatusUnauthorized, "invalid user context")
		return "", false
	}
	return userID, true
}
