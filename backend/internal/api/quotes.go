package api

import (
	"net/http"

	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/service"
	"github.com/gin-gonic/gin"
)

type QuoteHandler struct {
	quoteService *service.QuoteService
}

func NewQuoteHandler(quoteService *service.QuoteService) *QuoteHandler {
	return &QuoteHandler{quoteService: quoteService}
}

func (h *QuoteHandler) ListQuotes(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	textID := c.Query("textId")

	quoteList, listErr := h.quoteService.List(c.Request.Context(), userID, textID)
	if listErr != nil {
		response.HandleError(c, "failed to list quotes", listErr)
		return
	}

	c.JSON(http.StatusOK, quoteList)
}

func (h *QuoteHandler) CaptureQuote(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	var req request.CreateQuoteRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	quote, captureErr := h.quoteService.Capture(c.Request.Context(), userID, req)
	if captureErr != nil {
		response.HandleError(c, "failed to capture quote", captureErr)
		return
	}

	c.JSON(http.StatusCreated, quote)
}

func (h *QuoteHandler) UpdateQuote(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	quoteID := c.Param("id")

	var req request.UpdateQuoteRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	updateErr := h.quoteService.Update(c.Request.Context(), userID, quoteID, req)
	if updateErr != nil {
		response.HandleError(c, "failed to update quote", updateErr)
		return
	}

	response.RespondStatus(c, http.StatusOK, "updated")
}

func (h *QuoteHandler) DeleteQuote(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	quoteID := c.Param("id")

	deleteErr := h.quoteService.Delete(c.Request.Context(), userID, quoteID)
	if deleteErr != nil {
		response.HandleError(c, "failed to delete quote", deleteErr)
		return
	}

	response.RespondStatus(c, http.StatusOK, "deleted")
}

func (h *QuoteHandler) PromoteQuote(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	quoteID := c.Param("id")

	var req request.CreateNodeRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	node, promoteErr := h.quoteService.Promote(c.Request.Context(), quoteID, userID, req)
	if promoteErr != nil {
		response.HandleError(c, "failed to promote quote", promoteErr)
		return
	}

	c.JSON(http.StatusCreated, node)
}
