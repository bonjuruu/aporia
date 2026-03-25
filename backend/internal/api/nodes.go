package api

import (
	"net/http"

	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/service"
	"github.com/gin-gonic/gin"
)

type NodeHandler struct {
	service *service.NodeService
}

func NewNodeHandler(service *service.NodeService) *NodeHandler {
	return &NodeHandler{service: service}
}

func (h *NodeHandler) ListNodes(c *gin.Context) {
	nodeList, listNodesErr := h.service.ListNodes(c.Request.Context())
	if listNodesErr != nil {
		response.HandleError(c, "failed to list nodes", listNodesErr)
		return
	}

	c.JSON(http.StatusOK, nodeList)
}

func (h *NodeHandler) GetNode(c *gin.Context) {
	id := c.Param("id")

	node, getNodeErr := h.service.GetNode(c.Request.Context(), id)
	if getNodeErr != nil {
		response.HandleError(c, "failed to get node", getNodeErr)
		return
	}

	c.JSON(http.StatusOK, node)
}

func (h *NodeHandler) CreateNode(c *gin.Context) {
	var req request.CreateNodeRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	node, createNodeErr := h.service.CreateNode(c.Request.Context(), req)
	if createNodeErr != nil {
		response.HandleError(c, "failed to create node", createNodeErr)
		return
	}

	c.JSON(http.StatusCreated, node)
}

func (h *NodeHandler) UpdateNode(c *gin.Context) {
	id := c.Param("id")

	var req request.UpdateNodeRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	if updateNodeErr := h.service.UpdateNode(c.Request.Context(), id, req); updateNodeErr != nil {
		response.HandleError(c, "failed to update node", updateNodeErr)
		return
	}

	response.RespondStatus(c, http.StatusOK, "updated")
}

func (h *NodeHandler) DeleteNode(c *gin.Context) {
	id := c.Param("id")

	if deleteNodeErr := h.service.DeleteNode(c.Request.Context(), id); deleteNodeErr != nil {
		response.HandleError(c, "failed to delete node", deleteNodeErr)
		return
	}

	response.RespondStatus(c, http.StatusOK, "deleted")
}

func (h *NodeHandler) Search(c *gin.Context) {
	query := c.Query("q")

	nodeList, searchErr := h.service.Search(c.Request.Context(), query)
	if searchErr != nil {
		response.HandleError(c, "failed to search nodes", searchErr)
		return
	}

	c.JSON(http.StatusOK, nodeList)
}
