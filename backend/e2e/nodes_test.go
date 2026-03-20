package e2e

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/bonjuruu/aporia/internal/response"
	"github.com/stretchr/testify/assert"
)

func TestNodesJourney(t *testing.T) {
	cleanDB(t)
	token := registerAndLogin(t, "plato@academy.gr", "password123")

	// Start with an empty graph
	var emptyNodeList []response.GraphNode
	doRequest(t, http.MethodGet, "/api/nodes", nil, token, http.StatusOK, &emptyNodeList)
	assert.Empty(t, emptyNodeList)

	// Create all four node types
	var platoNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "THINKER", "name": "Plato", "description": "Greek philosopher", "bornYear": -428, "diedYear": -348,
	}, token, http.StatusCreated, &platoNode)
	assert.NotEmpty(t, platoNode.ID)
	assert.Equal(t, "Plato", platoNode.Label)

	var conceptNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "CONCEPT", "name": "Theory of Forms", "description": "Abstract perfect forms", "year": -380,
	}, token, http.StatusCreated, &conceptNode)

	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "CLAIM", "content": "The world of Forms is more real than the physical world",
	}, token, http.StatusCreated, nil)

	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "TEXT", "title": "The Republic", "publishedYear": -375,
	}, token, http.StatusCreated, nil)

	// List should now have 4 nodes
	var nodeList []response.GraphNode
	doRequest(t, http.MethodGet, "/api/nodes", nil, token, http.StatusOK, &nodeList)
	assert.Len(t, nodeList, 4)

	// Get Plato by ID and verify properties
	var detail response.NodeDetail
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/nodes/%s", platoNode.ID), nil, token, http.StatusOK, &detail)
	assert.Equal(t, platoNode.ID, detail.ID)
	assert.Equal(t, "Plato", detail.Properties["name"])

	// Update Plato's description
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/nodes/%s", platoNode.ID), map[string]any{
		"type": "THINKER", "description": "Athenian philosopher, founder of the Academy",
	}, token, http.StatusOK, nil)

	// Verify the update persisted
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/nodes/%s", platoNode.ID), nil, token, http.StatusOK, &detail)
	assert.Equal(t, "Athenian philosopher, founder of the Academy", detail.Properties["description"])
	assert.Equal(t, "Plato", detail.Properties["name"])

	// Delete Plato
	doRequest(t, http.MethodDelete, fmt.Sprintf("/api/nodes/%s", platoNode.ID), nil, token, http.StatusOK, nil)

	// Verify it's gone
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/nodes/%s", platoNode.ID), nil, token, http.StatusNotFound, nil)

	// List should now have 3 nodes
	doRequest(t, http.MethodGet, "/api/nodes", nil, token, http.StatusOK, &nodeList)
	assert.Len(t, nodeList, 3)

	// Search should find "Theory of Forms" by name
	var searchResult []response.GraphNode
	doRequest(t, http.MethodGet, "/api/search?q=forms", nil, token, http.StatusOK, &searchResult)
	assert.GreaterOrEqual(t, len(searchResult), 1)

	found := false
	for _, node := range searchResult {
		if node.Label == "Theory of Forms" {
			found = true
			break
		}
	}
	assert.True(t, found, "expected to find 'Theory of Forms' in search results")
}
