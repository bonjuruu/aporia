package response

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Status int    `json:"status"`
	Error  string `json:"error"`
}

type StatusResponse struct {
	Status string `json:"status"`
}

type TokenResponse struct {
	Token string `json:"token"`
}

func Abort(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, ErrorResponse{Status: status, Error: message})
}

func RespondError(c *gin.Context, status int, message string) {
	c.JSON(status, ErrorResponse{Status: status, Error: message})
}

func RespondStatus(c *gin.Context, status int, message string) {
	c.JSON(status, StatusResponse{Status: message})
}

// HandleError checks if err is an *AppError and responds with its status and message.
// For unrecognized errors, it logs and responds with 500.
func HandleError(c *gin.Context, logMessage string, err error) {
	if appErr, ok := errors.AsType[*apperror.AppError](err); ok {
		RespondError(c, appErr.Status, appErr.Message)
		return
	}
	slog.Error(logMessage, "error", err)
	RespondError(c, http.StatusInternalServerError, "internal server error")
}
