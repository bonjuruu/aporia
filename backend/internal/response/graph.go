package response

import "github.com/bonjuruu/aporia/internal/models"

type GraphData struct {
	Nodes []GraphNode   `json:"nodes"`
	Edges []models.Edge `json:"edges"`
}

func NewGraphData() *GraphData {
	return &GraphData{
		Nodes: []GraphNode{},
		Edges: []models.Edge{},
	}
}
