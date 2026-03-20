package response

import "github.com/bonjuruu/aporia/internal/models"

type GraphNode struct {
	ID    string          `json:"id"`
	Label string          `json:"label"`
	Type  models.NodeType `json:"type"`
	Year  *int            `json:"year"`
}

type NodeDetail struct {
	ID         string            `json:"id"`
	Type       models.NodeType   `json:"type"`
	Properties map[string]any    `json:"properties"`
	Outgoing   []ConnectionEntry `json:"outgoing"`
	Incoming   []ConnectionEntry `json:"incoming"`
}

type ConnectionEntry struct {
	Edge models.Edge `json:"edge"`
	Node GraphNode   `json:"node"`
}
