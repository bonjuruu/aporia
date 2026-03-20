package models

import "fmt"

type NodeType string

const (
	NodeTypeThinker NodeType = "THINKER"
	NodeTypeConcept NodeType = "CONCEPT"
	NodeTypeClaim   NodeType = "CLAIM"
	NodeTypeText    NodeType = "TEXT"
)

var validNodeTypes = map[NodeType]bool{
	NodeTypeThinker: true,
	NodeTypeConcept: true,
	NodeTypeClaim:   true,
	NodeTypeText:    true,
}

func ValidNodeType(t NodeType) bool {
	return validNodeTypes[t]
}

type Thinker struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Notes       string `json:"notes"`
	BornYear    *int   `json:"bornYear"`
	DiedYear    *int   `json:"diedYear"`
}

func (t Thinker) String() string {
	bornYear := "nil"
	diedYear := "nil"
	if t.BornYear != nil {
		bornYear = fmt.Sprintf("%d", *t.BornYear)
	}
	if t.DiedYear != nil {
		diedYear = fmt.Sprintf("%d", *t.DiedYear)
	}
	return fmt.Sprintf("Thinker{id:%s, name:%s, bornYear:%s, diedYear:%s}", t.ID, t.Name, bornYear, diedYear)
}

type Concept struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Notes       string `json:"notes"`
	Year        *int   `json:"year"`
}

func (c Concept) String() string {
	year := "nil"
	if c.Year != nil {
		year = fmt.Sprintf("%d", *c.Year)
	}
	return fmt.Sprintf("Concept{id:%s, name:%s, year:%s}", c.ID, c.Name, year)
}

type Claim struct {
	ID      string `json:"id"`
	Content string `json:"content"`
	Notes   string `json:"notes"`
	Year    *int   `json:"year"`
}

func (c Claim) String() string {
	year := "nil"
	if c.Year != nil {
		year = fmt.Sprintf("%d", *c.Year)
	}
	return fmt.Sprintf("Claim{id:%s, content:%q, year:%s}", c.ID, c.Content, year)
}

type Text struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	Notes         string `json:"notes"`
	PublishedYear *int   `json:"publishedYear"`
}

func (t Text) String() string {
	publishedYear := "nil"
	if t.PublishedYear != nil {
		publishedYear = fmt.Sprintf("%d", *t.PublishedYear)
	}
	return fmt.Sprintf("Text{id:%s, title:%s, publishedYear:%s}", t.ID, t.Title, publishedYear)
}

type ThinkerUpdate struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Notes       *string `json:"notes,omitempty"`
	BornYear    *int    `json:"bornYear,omitempty"`
	DiedYear    *int    `json:"diedYear,omitempty"`
}

type ConceptUpdate struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Notes       *string `json:"notes,omitempty"`
	Year        *int    `json:"year,omitempty"`
}

type ClaimUpdate struct {
	Content *string `json:"content,omitempty"`
	Notes   *string `json:"notes,omitempty"`
	Year    *int    `json:"year,omitempty"`
}

type TextUpdate struct {
	Title         *string `json:"title,omitempty"`
	Description   *string `json:"description,omitempty"`
	Notes         *string `json:"notes,omitempty"`
	PublishedYear *int    `json:"publishedYear,omitempty"`
}
