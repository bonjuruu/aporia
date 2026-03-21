package models

type QuoteStatus string

const (
	QuoteStatusRaw      QuoteStatus = "raw"
	QuoteStatusPromoted QuoteStatus = "promoted"
)

type Quote struct {
	ID             string      `json:"id"`
	Content        string      `json:"content"`
	SourceTextID   string      `json:"sourceTextId"`
	SourceTextTitle string     `json:"sourceTextTitle"`
	Page           *int        `json:"page"`
	Reaction       string      `json:"reaction"`
	Status         QuoteStatus `json:"status"`
	PromotedNodeID string      `json:"promotedNodeId"`
	CreatedAt      string      `json:"createdAt"`
}
