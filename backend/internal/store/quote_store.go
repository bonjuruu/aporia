package store

import (
	"context"
	"fmt"
	"time"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/util"
)

type QuoteStore interface {
	Create(ctx context.Context, userID string, quote models.Quote) (*models.Quote, error)
	ListByUser(ctx context.Context, userID string, textID string) ([]*models.Quote, error)
	Update(ctx context.Context, userID string, id string, reaction *string, page *int) error
	Delete(ctx context.Context, userID string, id string) error
	Promote(ctx context.Context, userID string, quoteID string, label string, props map[string]any) (*response.GraphNode, error)
}

type quoteStore struct {
	neo4jKit neo4j_kit.Neo4jKit
}

func NewQuoteStore(neo4jKit neo4j_kit.Neo4jKit) QuoteStore {
	return &quoteStore{neo4jKit: neo4jKit}
}

func (s *quoteStore) Create(ctx context.Context, userID string, quote models.Quote) (*models.Quote, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {id: $user_id}), (t:Text {id: $source_text_id})
		CREATE (q:Quote {
			id: $id,
			content: $content,
			page: $page,
			reaction: $reaction,
			status: "raw",
			created_at: $created_at
		})
		CREATE (u)-[:CAPTURED]->(q)
		CREATE (q)-[:FROM_TEXT]->(t)
		RETURN q.id as id, q.content as content, q.page as page,
			q.reaction as reaction, q.status as status,
			q.created_at as created_at,
			t.id as source_text_id, t.title as source_text_title
	`, map[string]any{
		"id":             quote.ID,
		"user_id":        userID,
		"source_text_id": quote.SourceTextID,
		"content":        quote.Content,
		"page":           util.DerefOrNil(quote.Page),
		"reaction":       quote.Reaction,
		"created_at":     time.Now().UTC().Format(time.RFC3339),
	})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to create quote: %w", singleErr)
	}
	if record == nil {
		return nil, apperror.NewBadRequest("user or source text not found")
	}

	createdQuote := &models.Quote{
		ID:              util.RecordString(record, "id"),
		Content:         util.RecordString(record, "content"),
		SourceTextID:    util.RecordString(record, "source_text_id"),
		SourceTextTitle: util.RecordString(record, "source_text_title"),
		Page:            util.RecordIntPtr(record, "page"),
		Reaction:        util.RecordString(record, "reaction"),
		Status:          models.QuoteStatus(util.RecordString(record, "status")),
		CreatedAt:       util.RecordString(record, "created_at"),
	}

	return createdQuote, nil
}

func (s *quoteStore) ListByUser(ctx context.Context, userID string, textID string) ([]*models.Quote, error) {
	params := map[string]any{"user_id": userID}

	query := `
		MATCH (u:User {id: $user_id})-[:CAPTURED]->(q:Quote)-[:FROM_TEXT]->(t:Text)
	`
	if textID != "" {
		query += `WHERE t.id = $text_id `
		params["text_id"] = textID
	}
	query += `
		RETURN q.id as id, q.content as content, q.page as page,
			q.reaction as reaction, q.status as status,
			q.created_at as created_at,
			q.promoted_node_id as promoted_node_id,
			t.id as source_text_id, t.title as source_text_title
		ORDER BY q.created_at DESC
		LIMIT 500
	`

	recordList, collectErr := s.neo4jKit.Collect(ctx, query, params)
	if collectErr != nil {
		return nil, fmt.Errorf("failed to list quotes: %w", collectErr)
	}

	quoteList := make([]*models.Quote, 0, len(recordList))
	for _, record := range recordList {
		quote := &models.Quote{
			ID:              util.RecordString(record, "id"),
			Content:         util.RecordString(record, "content"),
			SourceTextID:    util.RecordString(record, "source_text_id"),
			SourceTextTitle: util.RecordString(record, "source_text_title"),
			Page:            util.RecordIntPtr(record, "page"),
			Reaction:        util.RecordString(record, "reaction"),
			Status:          models.QuoteStatus(util.RecordString(record, "status")),
			PromotedNodeID:  util.RecordString(record, "promoted_node_id"),
			CreatedAt:       util.RecordString(record, "created_at"),
		}
		quoteList = append(quoteList, quote)
	}

	return quoteList, nil
}

func (s *quoteStore) Update(ctx context.Context, userID string, id string, reaction *string, page *int) error {
	props := map[string]any{}
	if reaction != nil {
		props["reaction"] = *reaction
	}
	if page != nil {
		props["page"] = *page
	}

	if len(props) == 0 {
		return apperror.NewBadRequest("no fields to update")
	}

	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {id: $user_id})-[:CAPTURED]->(q:Quote {id: $id})
		SET q += $props
		RETURN q.id as id
	`, map[string]any{"id": id, "user_id": userID, "props": props})
	if singleErr != nil {
		return fmt.Errorf("failed to update quote: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("quote not found")
	}

	return nil
}

func (s *quoteStore) Delete(ctx context.Context, userID string, id string) error {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {id: $user_id})-[:CAPTURED]->(q:Quote {id: $id})
		WITH q, q.id as deletedId
		DETACH DELETE q
		RETURN deletedId as id
	`, map[string]any{"id": id, "user_id": userID})
	if singleErr != nil {
		return fmt.Errorf("failed to delete quote: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("quote not found")
	}

	return nil
}

func validPromoteLabel(label string) bool {
	switch label {
	case "Thinker", "Concept", "Claim", "Text":
		return true
	default:
		return false
	}
}

func (s *quoteStore) Promote(ctx context.Context, userID string, quoteID string, label string, props map[string]any) (*response.GraphNode, error) {
	if !validPromoteLabel(label) {
		return nil, apperror.NewBadRequest("invalid node label: " + label)
	}

	query := fmt.Sprintf(`
		MATCH (u:User {id: $user_id})-[:CAPTURED]->(q:Quote {id: $quote_id})
		CREATE (n:%s)
		SET n = $props
		SET q.status = "promoted", q.promoted_node_id = n.id
		RETURN n.id as id,
			coalesce(n.name, n.title, n.content) as label,
			toUpper(labels(n)[0]) as type,
			coalesce(n.born_year, n.published_year, n.year) as year
	`, label)

	record, singleErr := s.neo4jKit.Single(ctx, query, map[string]any{
		"user_id":  userID,
		"quote_id": quoteID,
		"props":    props,
	})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to promote quote: %w", singleErr)
	}
	if record == nil {
		return nil, apperror.NewNotFound("quote not found")
	}

	graphNode := &response.GraphNode{
		ID:    util.RecordString(record, "id"),
		Label: util.RecordString(record, "label"),
		Type:  models.NodeType(util.RecordString(record, "type")),
		Year:  util.RecordIntPtr(record, "year"),
	}

	return graphNode, nil
}
