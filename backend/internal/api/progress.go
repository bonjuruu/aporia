package api

import (
	"net/http"

	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/service"
	"github.com/gin-gonic/gin"
)

type ProgressHandler struct {
	progressService *service.ProgressService
}

func NewProgressHandler(progressService *service.ProgressService) *ProgressHandler {
	return &ProgressHandler{progressService: progressService}
}

func (h *ProgressHandler) ListProgress(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.RespondError(c, http.StatusUnauthorized, "not authenticated")
		return
	}

	progressList, listErr := h.progressService.List(c.Request.Context(), userID.(string))
	if listErr != nil {
		response.HandleError(c, "failed to list reading progress", listErr)
		return
	}

	c.JSON(http.StatusOK, progressList)
}

func (h *ProgressHandler) GetProgress(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.RespondError(c, http.StatusUnauthorized, "not authenticated")
		return
	}

	textID := c.Param("textId")

	progress, getErr := h.progressService.Get(c.Request.Context(), userID.(string), textID)
	if getErr != nil {
		response.HandleError(c, "failed to get reading progress", getErr)
		return
	}

	c.JSON(http.StatusOK, progress)
}

func (h *ProgressHandler) UpdateProgress(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.RespondError(c, http.StatusUnauthorized, "not authenticated")
		return
	}

	textID := c.Param("textId")

	var req request.UpdateProgressRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	progress, updateErr := h.progressService.Update(c.Request.Context(), userID.(string), textID, req)
	if updateErr != nil {
		response.HandleError(c, "failed to update reading progress", updateErr)
		return
	}

	c.JSON(http.StatusOK, progress)
}
