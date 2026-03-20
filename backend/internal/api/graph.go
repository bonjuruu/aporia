package api

import (
	"net/http"

	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/service"
	"github.com/gin-gonic/gin"
)

type GraphHandler struct {
	service *service.GraphService
}

func NewGraphHandler(service *service.GraphService) *GraphHandler {
	return &GraphHandler{service: service}
}

func (h *GraphHandler) GetFullGraph(c *gin.Context) {
	graphData, getFullGraphErr := h.service.GetFullGraph(c.Request.Context())
	if getFullGraphErr != nil {
		response.HandleError(c, "failed to get full graph", getFullGraphErr)
		return
	}

	if graphData == nil {
		graphData = response.NewGraphData()
	}

	c.JSON(http.StatusOK, graphData)
}

func (h *GraphHandler) GetSubgraph(c *gin.Context) {
	textID := c.Param("textId")

	graphData, getSubgraphErr := h.service.GetSubgraph(c.Request.Context(), textID)
	if getSubgraphErr != nil {
		response.HandleError(c, "failed to get subgraph", getSubgraphErr)
		return
	}

	if graphData == nil {
		graphData = response.NewGraphData()
	}

	c.JSON(http.StatusOK, graphData)
}

func (h *GraphHandler) GetPath(c *gin.Context) {
	fromID := c.Query("from")
	toID := c.Query("to")

	graphData, getPathErr := h.service.GetPath(c.Request.Context(), fromID, toID)
	if getPathErr != nil {
		response.HandleError(c, "failed to get path", getPathErr)
		return
	}

	if graphData == nil {
		graphData = response.NewGraphData()
	}

	c.JSON(http.StatusOK, graphData)
}
