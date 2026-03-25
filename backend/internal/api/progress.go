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
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	progressList, listErr := h.progressService.List(c.Request.Context(), userID)
	if listErr != nil {
		response.HandleError(c, "failed to list reading progress", listErr)
		return
	}

	c.JSON(http.StatusOK, progressList)
}

func (h *ProgressHandler) GetProgress(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	textID := c.Param("textId")

	progress, getErr := h.progressService.Get(c.Request.Context(), userID, textID)
	if getErr != nil {
		response.HandleError(c, "failed to get reading progress", getErr)
		return
	}

	c.JSON(http.StatusOK, progress)
}

func (h *ProgressHandler) UpdateProgress(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	textID := c.Param("textId")

	var req request.UpdateProgressRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	progress, updateErr := h.progressService.Update(c.Request.Context(), userID, textID, req)
	if updateErr != nil {
		response.HandleError(c, "failed to update reading progress", updateErr)
		return
	}

	c.JSON(http.StatusOK, progress)
}
