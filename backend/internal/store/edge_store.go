package store

import (
	"context"
	"fmt"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/models"
)

type EdgeStore interface {
	Create(ctx context.Context, id string, edgeType models.EdgeType, sourceID, targetID, description, sourceTextID string) (*models.Edge, error)
	Update(ctx context.Context, id string, update models.EdgeUpdate) error
	Delete(ctx context.Context, id string) error
}

type edgeStore struct {
	neo4jKit neo4j_kit.Neo4jKit
}

func NewEdgeStore(neo4jKit neo4j_kit.Neo4jKit) EdgeStore {
	return &edgeStore{neo4jKit: neo4jKit}
}

func (s *edgeStore) Create(ctx context.Context, id string, edgeType models.EdgeType, sourceID, targetID, description, sourceTextID string) (*models.Edge, error) {
	if !models.ValidEdgeType(edgeType) {
		return nil, fmt.Errorf("invalid edge type: %s", edgeType)
	}

	query := fmt.Sprintf(`
		MATCH (a {id: $source_id}), (b {id: $target_id})
		WHERE (a:Thinker OR a:Concept OR a:Claim OR a:Text)
		  AND (b:Thinker OR b:Concept OR b:Claim OR b:Text)
		CREATE (a)-[r:%s {id: $id, description: $description, source_text_id: $source_text_id}]->(b)
		RETURN r
	`, string(edgeType))

	params := map[string]any{
		"id":             id,
		"source_id":      sourceID,
		"target_id":      targetID,
		"description":    description,
		"source_text_id": sourceTextID,
	}

	record, singleErr := s.neo4jKit.Single(ctx, query, params)
	if singleErr != nil {
		return nil, fmt.Errorf("failed to create edge: %w", singleErr)
	}
	if record == nil {
		return nil, apperror.NewNotFound("source or target node not found")
	}

	edge := &models.Edge{
		ID:           id,
		Source:       sourceID,
		Target:       targetID,
		Type:         edgeType,
		Description:  description,
		SourceTextID: sourceTextID,
	}

	return edge, nil
}

func (s *edgeStore) Update(ctx context.Context, id string, update models.EdgeUpdate) error {
	props := make(map[string]any)
	if update.Description != nil {
		props["description"] = *update.Description
	}
	if update.SourceTextID != nil {
		props["source_text_id"] = *update.SourceTextID
	}

	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH ()-[r {id: $id}]->()
		SET r += $props
		RETURN r.id as id
	`, map[string]any{"id": id, "props": props})
	if singleErr != nil {
		return fmt.Errorf("failed to update edge: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("not found")
	}

	return nil
}

func (s *edgeStore) Delete(ctx context.Context, id string) error {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH ()-[r {id: $id}]->()
		WITH r, r.id as edgeId
		DELETE r
		RETURN edgeId
	`, map[string]any{"id": id})
	if singleErr != nil {
		return fmt.Errorf("failed to delete edge: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("not found")
	}

	return nil
}
