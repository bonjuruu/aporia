package e2e

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/stretchr/testify/assert"
)

func TestEdgesJourney(t *testing.T) {
	cleanDB(t)
	auth := registerAndLogin(t, "plato@academy.gr", "password123")

	// Create Plato and Aristotle
	var platoNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "THINKER", "name": "Plato", "bornYear": -428,
	}, auth, http.StatusCreated, &platoNode)

	var aristotleNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "THINKER", "name": "Aristotle", "bornYear": -384,
	}, auth, http.StatusCreated, &aristotleNode)

	// Create an INFLUENCED edge from Plato to Aristotle
	var createdEdge models.Edge
	doRequest(t, http.MethodPost, "/api/edges", map[string]any{
		"source": platoNode.ID, "target": aristotleNode.ID, "type": "INFLUENCED",
		"description": "Plato was Aristotle's teacher at the Academy",
	}, auth, http.StatusCreated, &createdEdge)
	assert.Equal(t, models.EdgeTypeInfluenced, createdEdge.Type)
	assert.Equal(t, platoNode.ID, createdEdge.Source)
	assert.Equal(t, aristotleNode.ID, createdEdge.Target)

	// Verify the edge shows up in Plato's outgoing connections
	var platoDetail response.NodeDetail
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/nodes/%s", platoNode.ID), nil, auth, http.StatusOK, &platoDetail)
	assert.Len(t, platoDetail.Outgoing, 1)
	assert.Equal(t, "Aristotle", platoDetail.Outgoing[0].Node.Label)

	// Verify the edge shows up in Aristotle's incoming connections
	var aristotleDetail response.NodeDetail
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/nodes/%s", aristotleNode.ID), nil, auth, http.StatusOK, &aristotleDetail)
	assert.Len(t, aristotleDetail.Incoming, 1)

	// Update the edge description
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/edges/%s", createdEdge.ID), map[string]any{
		"description": "Plato mentored Aristotle for 20 years at the Academy",
	}, auth, http.StatusOK, nil)

	// Verify the full graph includes both nodes and the edge
	var graphData response.GraphData
	doRequest(t, http.MethodGet, "/api/graph", nil, auth, http.StatusOK, &graphData)
	assert.Len(t, graphData.Nodes, 2)
	assert.Len(t, graphData.Edges, 1)

	// Delete the edge
	doRequest(t, http.MethodDelete, fmt.Sprintf("/api/edges/%s", createdEdge.ID), nil, auth, http.StatusOK, nil)

	// Plato should have no outgoing connections now
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/nodes/%s", platoNode.ID), nil, auth, http.StatusOK, &platoDetail)
	assert.Empty(t, platoDetail.Outgoing)
}
