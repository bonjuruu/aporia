package request

import "github.com/bonjuruu/aporia/internal/models"

type CreateNodeRequest struct {
	Type          models.NodeType `json:"type"                   validate:"required,node_type"`
	Name          string          `json:"name,omitempty"         validate:"required_if=Type THINKER,required_if=Type CONCEPT"`
	Title         string          `json:"title,omitempty"        validate:"required_if=Type TEXT"`
	Content       string          `json:"content,omitempty"      validate:"required_if=Type CLAIM"`
	Description   string          `json:"description,omitempty"`
	Notes         string          `json:"notes,omitempty"`
	BornYear      *int            `json:"bornYear,omitempty"`
	DiedYear      *int            `json:"diedYear,omitempty"`
	Tradition     string          `json:"tradition,omitempty"`
	Year          *int            `json:"year,omitempty"`
	PublishedYear *int            `json:"publishedYear,omitempty"`
}

type UpdateNodeRequest struct {
	Type          models.NodeType `json:"type"                   validate:"required,node_type"`
	Name          *string         `json:"name,omitempty"`
	Title         *string         `json:"title,omitempty"`
	Content       *string         `json:"content,omitempty"`
	Description   *string         `json:"description,omitempty"`
	Notes         *string         `json:"notes,omitempty"`
	BornYear      *int            `json:"bornYear,omitempty"`
	DiedYear      *int            `json:"diedYear,omitempty"`
	Tradition     *string         `json:"tradition,omitempty"`
	Year          *int            `json:"year,omitempty"`
	PublishedYear *int            `json:"publishedYear,omitempty"`
}

func (r UpdateNodeRequest) HasUpdates() bool {
	return r.Name != nil || r.Title != nil || r.Content != nil ||
		r.Description != nil || r.Notes != nil || r.BornYear != nil ||
		r.DiedYear != nil || r.Tradition != nil || r.Year != nil || r.PublishedYear != nil
}
