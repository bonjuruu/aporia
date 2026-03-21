package models

import "fmt"

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

func (q Quote) String() string {
	page := "nil"
	if q.Page != nil {
		page = fmt.Sprintf("%d", *q.Page)
	}
	return fmt.Sprintf("Quote{id:%s, sourceTextId:%s, status:%s, page:%s}", q.ID, q.SourceTextID, q.Status, page)
}
