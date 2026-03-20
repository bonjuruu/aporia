package store

import (
	"context"
	"fmt"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/util"
)

type AnnotationStore interface {
	Upsert(ctx context.Context, userID, nodeID, stance, notes string) error
	GetByUserID(ctx context.Context, userID string) ([]models.UserAnnotation, error)
	GetByUserAndNode(ctx context.Context, userID, nodeID string) (*models.UserAnnotation, error)
}

type annotationStore struct {
	neo4jKit neo4j_kit.Neo4jKit
}

func NewAnnotationStore(neo4jKit neo4j_kit.Neo4jKit) AnnotationStore {
	return &annotationStore{neo4jKit: neo4jKit}
}

func (s *annotationStore) Upsert(ctx context.Context, userID, nodeID, stance, notes string) error {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {id: $user_id}), (n {id: $node_id})
		WHERE n:Thinker OR n:Concept OR n:Claim OR n:Text
		MERGE (u)-[a:ANNOTATES]->(n)
		SET a.stance = $stance, a.notes = $notes
		RETURN n.id as nodeId
	`, map[string]any{
		"user_id": userID,
		"node_id": nodeID,
		"stance":  stance,
		"notes":   notes,
	})
	if singleErr != nil {
		return fmt.Errorf("failed to upsert annotation: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("not found")
	}

	return nil
}

func (s *annotationStore) GetByUserID(ctx context.Context, userID string) ([]models.UserAnnotation, error) {
	recordList, collectErr := s.neo4jKit.Collect(ctx, `
		MATCH (u:User {id: $user_id})-[a:ANNOTATES]->(n)
		RETURN n.id as node_id, a.stance as stance, a.notes as notes
	`, map[string]any{"user_id": userID})
	if collectErr != nil {
		return nil, fmt.Errorf("failed to get annotations: %w", collectErr)
	}

	annotationList := []models.UserAnnotation{}
	for _, record := range recordList {
		annotation := models.UserAnnotation{
			UserID: userID,
			NodeID: util.RecordString(record, "node_id"),
			Stance: util.RecordString(record, "stance"),
			Notes:  util.RecordString(record, "notes"),
		}
		annotationList = append(annotationList, annotation)
	}

	return annotationList, nil
}

func (s *annotationStore) GetByUserAndNode(ctx context.Context, userID, nodeID string) (*models.UserAnnotation, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {id: $user_id})-[a:ANNOTATES]->(n {id: $node_id})
		RETURN n.id as node_id, a.stance as stance, a.notes as notes
	`, map[string]any{"user_id": userID, "node_id": nodeID})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to get annotation: %w", singleErr)
	}

	if record == nil {
		return nil, nil
	}

	annotation := &models.UserAnnotation{
		UserID: userID,
		NodeID: util.RecordString(record, "node_id"),
		Stance: util.RecordString(record, "stance"),
		Notes:  util.RecordString(record, "notes"),
	}

	return annotation, nil
}
