package request

import "github.com/bonjuruu/aporia/internal/models"

type CreateEdgeRequest struct {
	Source       string          `json:"source"                validate:"required"`
	Target       string          `json:"target"                validate:"required"`
	Type         models.EdgeType `json:"type"                  validate:"required,edge_type"`
	Description  string          `json:"description,omitempty"`
	SourceTextID string          `json:"sourceTextId,omitempty"`
}

type UpdateEdgeRequest struct {
	Description  *string `json:"description,omitempty"`
	SourceTextID *string `json:"sourceTextId,omitempty"`
}
