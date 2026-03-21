package e2e

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQuotesJourney(t *testing.T) {
	cleanDB(t)
	auth := registerAndLogin(t, "socrates@agora.gr", "password123")

	// Create a text node to use as source
	var textNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "TEXT", "title": "Apology", "publishedYear": -399,
	}, auth, http.StatusCreated, &textNode)
	require.NotEmpty(t, textNode.ID)

	// Create a second text for filtering
	var textNode2 response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "TEXT", "title": "Phaedo", "publishedYear": -360,
	}, auth, http.StatusCreated, &textNode2)

	// List quotes should be empty initially
	var emptyQuoteList []models.Quote
	doRequest(t, http.MethodGet, "/api/quotes", nil, auth, http.StatusOK, &emptyQuoteList)
	assert.Empty(t, emptyQuoteList)

	// Capture a quote
	var quote1 models.Quote
	doRequest(t, http.MethodPost, "/api/quotes", map[string]any{
		"content":      "The unexamined life is not worth living.",
		"sourceTextId": textNode.ID,
		"page":         38,
		"reaction":     "Foundational claim about philosophy",
	}, auth, http.StatusCreated, &quote1)
	assert.NotEmpty(t, quote1.ID)
	assert.Equal(t, "The unexamined life is not worth living.", quote1.Content)
	assert.Equal(t, textNode.ID, quote1.SourceTextID)
	assert.Equal(t, "Apology", quote1.SourceTextTitle)
	assert.Equal(t, 38, *quote1.Page)
	assert.Equal(t, "Foundational claim about philosophy", quote1.Reaction)
	assert.Equal(t, models.QuoteStatusRaw, quote1.Status)
	assert.NotEmpty(t, quote1.CreatedAt)

	// Capture a second quote from a different text
	var quote2 models.Quote
	doRequest(t, http.MethodPost, "/api/quotes", map[string]any{
		"content":      "The soul is immortal and imperishable.",
		"sourceTextId": textNode2.ID,
	}, auth, http.StatusCreated, &quote2)

	// List all quotes — should have 2
	var allQuoteList []models.Quote
	doRequest(t, http.MethodGet, "/api/quotes", nil, auth, http.StatusOK, &allQuoteList)
	assert.Len(t, allQuoteList, 2)

	// List quotes filtered by text — should have 1
	var filteredQuoteList []models.Quote
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/quotes?textId=%s", textNode.ID), nil, auth, http.StatusOK, &filteredQuoteList)
	assert.Len(t, filteredQuoteList, 1)
	assert.Equal(t, quote1.ID, filteredQuoteList[0].ID)

	// Update quote reaction and page
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/quotes/%s", quote1.ID), map[string]any{
		"reaction": "Core Socratic principle",
		"page":     39,
	}, auth, http.StatusOK, nil)

	// Verify update by listing
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/quotes?textId=%s", textNode.ID), nil, auth, http.StatusOK, &filteredQuoteList)
	assert.Len(t, filteredQuoteList, 1)
	assert.Equal(t, "Core Socratic principle", filteredQuoteList[0].Reaction)
	assert.Equal(t, 39, *filteredQuoteList[0].Page)

	// Promote quote to a claim node
	var promotedNode response.GraphNode
	doRequest(t, http.MethodPost, fmt.Sprintf("/api/quotes/%s/promote", quote1.ID), map[string]any{
		"type":    "CLAIM",
		"content": "The unexamined life is not worth living.",
	}, auth, http.StatusCreated, &promotedNode)
	assert.NotEmpty(t, promotedNode.ID)
	assert.Equal(t, models.NodeTypeClaim, promotedNode.Type)
	assert.Equal(t, "The unexamined life is not worth living.", promotedNode.Label)

	// Verify quote is now promoted
	doRequest(t, http.MethodGet, "/api/quotes", nil, auth, http.StatusOK, &allQuoteList)
	for _, quote := range allQuoteList {
		if quote.ID == quote1.ID {
			assert.Equal(t, models.QuoteStatusPromoted, quote.Status)
			assert.Equal(t, promotedNode.ID, quote.PromotedNodeID)
		}
	}

	// Verify the promoted node exists in the graph
	var nodeDetail response.NodeDetail
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/nodes/%s", promotedNode.ID), nil, auth, http.StatusOK, &nodeDetail)
	assert.Equal(t, promotedNode.ID, nodeDetail.ID)

	// Delete the second quote
	doRequest(t, http.MethodDelete, fmt.Sprintf("/api/quotes/%s", quote2.ID), nil, auth, http.StatusOK, nil)

	// Verify only 1 quote remains
	doRequest(t, http.MethodGet, "/api/quotes", nil, auth, http.StatusOK, &allQuoteList)
	assert.Len(t, allQuoteList, 1)
	assert.Equal(t, quote1.ID, allQuoteList[0].ID)

	// Capture with invalid source text should fail
	doRequest(t, http.MethodPost, "/api/quotes", map[string]any{
		"content":      "This should fail.",
		"sourceTextId": "nonexistent-text-id",
	}, auth, http.StatusBadRequest, nil)

	// Capture without content should fail
	doRequest(t, http.MethodPost, "/api/quotes", map[string]any{
		"sourceTextId": textNode.ID,
	}, auth, http.StatusBadRequest, nil)

	// Unauthenticated access should fail
	doUnauthenticatedRequest(t, http.MethodGet, "/api/quotes", nil, http.StatusUnauthorized, nil)

	// Cross-user ownership isolation — second user cannot update or delete first user's quotes
	otherAuth := registerAndLogin(t, "plato@academy.gr", "password123")

	// Other user cannot update first user's quote
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/quotes/%s", quote1.ID), map[string]any{
		"reaction": "hijacked",
	}, otherAuth, http.StatusNotFound, nil)

	// Other user cannot delete first user's quote
	doRequest(t, http.MethodDelete, fmt.Sprintf("/api/quotes/%s", quote1.ID), nil, otherAuth, http.StatusNotFound, nil)

	// Verify the quote is unchanged
	doRequest(t, http.MethodGet, "/api/quotes", nil, auth, http.StatusOK, &allQuoteList)
	assert.Len(t, allQuoteList, 1)
	assert.Equal(t, "Core Socratic principle", allQuoteList[0].Reaction)

	// Other user's quote list should be empty
	var otherQuoteList []models.Quote
	doRequest(t, http.MethodGet, "/api/quotes", nil, otherAuth, http.StatusOK, &otherQuoteList)
	assert.Empty(t, otherQuoteList)
}
