package api

import (
	"net/http"

	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/service"
	"github.com/gin-gonic/gin"
)

type EdgeHandler struct {
	service *service.EdgeService
}

func NewEdgeHandler(service *service.EdgeService) *EdgeHandler {
	return &EdgeHandler{service: service}
}

func (h *EdgeHandler) CreateEdge(c *gin.Context) {
	var req request.CreateEdgeRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	edge, createEdgeErr := h.service.CreateEdge(c.Request.Context(), req)
	if createEdgeErr != nil {
		response.HandleError(c, "failed to create edge", createEdgeErr)
		return
	}

	c.JSON(http.StatusCreated, edge)
}

func (h *EdgeHandler) UpdateEdge(c *gin.Context) {
	id := c.Param("id")

	var req request.UpdateEdgeRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	if updateEdgeErr := h.service.UpdateEdge(c.Request.Context(), id, req); updateEdgeErr != nil {
		response.HandleError(c, "failed to update edge", updateEdgeErr)
		return
	}

	response.RespondStatus(c, http.StatusOK, "updated")
}

func (h *EdgeHandler) DeleteEdge(c *gin.Context) {
	id := c.Param("id")

	if deleteEdgeErr := h.service.DeleteEdge(c.Request.Context(), id); deleteEdgeErr != nil {
		response.HandleError(c, "failed to delete edge", deleteEdgeErr)
		return
	}

	response.RespondStatus(c, http.StatusOK, "deleted")
}
