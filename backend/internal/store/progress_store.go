package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/util"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type ProgressStore interface {
	Get(ctx context.Context, userID string, textID string) (*models.ReadingProgress, error)
	List(ctx context.Context, userID string) ([]*models.ReadingProgress, error)
	Upsert(ctx context.Context, userID string, textID string, chapter string, totalChapters *int, lastReadAt string, sessionNotesJSON string) (*models.ReadingProgress, error)
}

type progressStore struct {
	neo4jKit neo4j_kit.Neo4jKit
}

func NewProgressStore(neo4jKit neo4j_kit.Neo4jKit) ProgressStore {
	return &progressStore{neo4jKit: neo4jKit}
}

func (s *progressStore) Get(ctx context.Context, userID string, textID string) (*models.ReadingProgress, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {id: $user_id})-[r:READING]->(t:Text {id: $text_id})
		RETURN r.chapter as chapter, r.total_chapters as total_chapters,
			r.last_read_at as last_read_at, r.session_notes as session_notes,
			t.id as text_id, t.title as text_title
	`, map[string]any{
		"user_id": userID,
		"text_id": textID,
	})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to get reading progress: %w", singleErr)
	}
	if record == nil {
		return nil, apperror.NewNotFound("reading progress not found")
	}

	return mapRecordToProgress(record), nil
}

func (s *progressStore) List(ctx context.Context, userID string) ([]*models.ReadingProgress, error) {
	recordList, collectErr := s.neo4jKit.Collect(ctx, `
		MATCH (u:User {id: $user_id})-[r:READING]->(t:Text)
		RETURN r.chapter as chapter, r.total_chapters as total_chapters,
			r.last_read_at as last_read_at, r.session_notes as session_notes,
			t.id as text_id, t.title as text_title
		ORDER BY r.last_read_at DESC
	`, map[string]any{
		"user_id": userID,
	})
	if collectErr != nil {
		return nil, fmt.Errorf("failed to list reading progress: %w", collectErr)
	}

	progressList := make([]*models.ReadingProgress, 0, len(recordList))
	for _, record := range recordList {
		progressList = append(progressList, mapRecordToProgress(record))
	}

	return progressList, nil
}

func (s *progressStore) Upsert(ctx context.Context, userID string, textID string, chapter string, totalChapters *int, lastReadAt string, sessionNotesJSON string) (*models.ReadingProgress, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {id: $user_id}), (t:Text {id: $text_id})
		MERGE (u)-[r:READING]->(t)
		SET r.chapter = $chapter,
			r.total_chapters = $total_chapters,
			r.last_read_at = $last_read_at,
			r.session_notes = $session_notes
		RETURN r.chapter as chapter, r.total_chapters as total_chapters,
			r.last_read_at as last_read_at, r.session_notes as session_notes,
			t.id as text_id, t.title as text_title
	`, map[string]any{
		"user_id":        userID,
		"text_id":        textID,
		"chapter":        chapter,
		"total_chapters": util.DerefOrNil(totalChapters),
		"last_read_at":   lastReadAt,
		"session_notes":  sessionNotesJSON,
	})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to upsert reading progress: %w", singleErr)
	}
	if record == nil {
		return nil, apperror.NewBadRequest("user or text not found")
	}

	return mapRecordToProgress(record), nil
}

func mapRecordToProgress(record *neo4j.Record) *models.ReadingProgress {
	return &models.ReadingProgress{
		TextID:        util.RecordString(record, "text_id"),
		TextTitle:     util.RecordString(record, "text_title"),
		Chapter:       util.RecordString(record, "chapter"),
		TotalChapters: util.RecordIntPtr(record, "total_chapters"),
		LastReadAt:    util.RecordString(record, "last_read_at"),
		SessionNotes:  unmarshalSessionNotes(util.RecordString(record, "session_notes")),
	}
}

func unmarshalSessionNotes(raw string) []models.SessionNote {
	if raw == "" {
		return []models.SessionNote{}
	}
	var sessionNoteList []models.SessionNote
	if unmarshalErr := json.Unmarshal([]byte(raw), &sessionNoteList); unmarshalErr != nil {
		return []models.SessionNote{}
	}
	return sessionNoteList
}
