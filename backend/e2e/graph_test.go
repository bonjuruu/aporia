package e2e

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/stretchr/testify/assert"
)

func TestGraphJourney(t *testing.T) {
	cleanDB(t)
	auth := registerAndLogin(t, "plato@academy.gr", "password123")

	// Build a small graph: Plato -> INFLUENCED -> Aristotle -> COINED -> Logic
	// Plato -> WROTE -> The Republic, with a DERIVES_FROM edge tagged to The Republic
	var platoNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "THINKER", "name": "Plato", "bornYear": -428,
	}, auth, http.StatusCreated, &platoNode)

	var aristotleNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "THINKER", "name": "Aristotle", "bornYear": -384,
	}, auth, http.StatusCreated, &aristotleNode)

	var logicNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "CONCEPT", "name": "Logic",
	}, auth, http.StatusCreated, &logicNode)

	var republicNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "TEXT", "title": "The Republic", "publishedYear": -375,
	}, auth, http.StatusCreated, &republicNode)

	// Create edges
	doRequest(t, http.MethodPost, "/api/edges", map[string]any{
		"source": platoNode.ID, "target": aristotleNode.ID, "type": "INFLUENCED",
	}, auth, http.StatusCreated, nil)

	doRequest(t, http.MethodPost, "/api/edges", map[string]any{
		"source": aristotleNode.ID, "target": logicNode.ID, "type": "COINED",
	}, auth, http.StatusCreated, nil)

	doRequest(t, http.MethodPost, "/api/edges", map[string]any{
		"source": platoNode.ID, "target": republicNode.ID, "type": "WROTE",
	}, auth, http.StatusCreated, nil)

	doRequest(t, http.MethodPost, "/api/edges", map[string]any{
		"source": platoNode.ID, "target": logicNode.ID, "type": "DERIVES_FROM", "sourceTextId": republicNode.ID,
	}, auth, http.StatusCreated, nil)

	// Full graph should have all 4 nodes and 4 edges
	var graphData response.GraphData
	doRequest(t, http.MethodGet, "/api/graph", nil, auth, http.StatusOK, &graphData)
	assert.Len(t, graphData.Nodes, 4)
	assert.Len(t, graphData.Edges, 4)

	// Subgraph filtered by The Republic should only return edges tagged with that text
	var subgraphData response.GraphData
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/graph/subgraph/%s", republicNode.ID), nil, auth, http.StatusOK, &subgraphData)
	assert.Len(t, subgraphData.Edges, 1)

	// Path from Plato to Logic should go through Aristotle
	var pathData response.GraphData
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/graph/path?from=%s&to=%s", platoNode.ID, logicNode.ID), nil, auth, http.StatusOK, &pathData)
	assert.GreaterOrEqual(t, len(pathData.Nodes), 2)
	assert.GreaterOrEqual(t, len(pathData.Edges), 1)

	// Search for "logic" should find the concept
	var searchResult []response.GraphNode
	doRequest(t, http.MethodGet, "/api/search?q=logic", nil, auth, http.StatusOK, &searchResult)
	assert.Len(t, searchResult, 1)
	assert.Equal(t, "Logic", searchResult[0].Label)

	// Annotations: mark a stance on the Logic concept
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/annotations/%s", logicNode.ID), map[string]any{
		"stance": "agree", "notes": "Foundational contribution to Western thought",
	}, auth, http.StatusOK, nil)

	// Fetch annotations and verify
	var annotationList []models.UserAnnotation
	doRequest(t, http.MethodGet, "/api/annotations", nil, auth, http.StatusOK, &annotationList)
	assert.Len(t, annotationList, 1)
	assert.Equal(t, logicNode.ID, annotationList[0].NodeID)
	assert.Equal(t, "agree", annotationList[0].Stance)
	assert.Equal(t, "Foundational contribution to Western thought", annotationList[0].Notes)
}
