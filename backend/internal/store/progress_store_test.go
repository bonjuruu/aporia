package store

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/bonjuruu/aporia/internal/apperror"
	neo4jKitMock "github.com/bonjuruu/aporia/internal/kit/neo4j_kit/mock"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestProgressStore_Get(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get reading progress", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "READING")
		}), map[string]any{
			"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
			"text_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
		}).Return(nil, errors.New("connection refused")).Once()

		result, getErr := progressStore.Get(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.Nil(t, result)
		assert.ErrorContains(t, getErr, "failed to get reading progress")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when no reading progress exists", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "READING")
		}), map[string]any{
			"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
			"text_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
		}).Return(nil, nil).Once()

		result, getErr := progressStore.Get(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.Nil(t, result)
		appErr, ok := errors.AsType[*apperror.AppError](getErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return reading progress with session notes when record is found", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		record := &neo4j.Record{
			Keys: []string{"chapter", "total_chapters", "last_read_at", "session_notes", "text_id", "text_title"},
			Values: []any{
				"3",
				int64(12),
				"2026-03-21T10:00:00Z",
				`[{"date":"2026-03-20T09:00:00Z","chapter":"1","note":"Started reading"}]`,
				"b2c3d4e5-f6a7-8901-bcde-f12345678901",
				"Republic",
			},
		}
		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "READING")
		}), map[string]any{
			"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
			"text_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
		}).Return(record, nil).Once()

		result, getErr := progressStore.Get(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.NoError(t, getErr)
		assert.Equal(t, "b2c3d4e5-f6a7-8901-bcde-f12345678901", result.TextID)
		assert.Equal(t, "Republic", result.TextTitle)
		assert.Equal(t, "3", result.Chapter)
		assert.Equal(t, 12, *result.TotalChapters)
		assert.Equal(t, "2026-03-21T10:00:00Z", result.LastReadAt)
		assert.Len(t, result.SessionNotes, 1)
		assert.Equal(t, "Started reading", result.SessionNotes[0].Note)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return empty session notes when session notes json is empty", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		record := &neo4j.Record{
			Keys:   []string{"chapter", "total_chapters", "last_read_at", "session_notes", "text_id", "text_title"},
			Values: []any{"1", nil, "2026-03-21T10:00:00Z", "", "b2c3d4e5-f6a7-8901-bcde-f12345678901", "Republic"},
		}
		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "READING")
		}), map[string]any{
			"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
			"text_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
		}).Return(record, nil).Once()

		result, getErr := progressStore.Get(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.NoError(t, getErr)
		assert.Empty(t, result.SessionNotes)
		assert.Nil(t, result.TotalChapters)
		neo4jKit.AssertExpectations(t)
	})
}

func TestProgressStore_List(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to collect reading progress", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "READING")
		}), map[string]any{"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"}).Return(nil, errors.New("connection refused")).Once()

		result, listErr := progressStore.List(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012")

		assert.Nil(t, result)
		assert.ErrorContains(t, listErr, "failed to list reading progress")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return empty list when no reading progress exists", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "READING")
		}), map[string]any{"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"}).Return([]*neo4j.Record{}, nil).Once()

		result, listErr := progressStore.List(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012")

		assert.Empty(t, result)
		assert.NoError(t, listErr)
		neo4jKit.AssertExpectations(t)
	})
}

func TestProgressStore_Upsert(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to upsert reading progress", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "MERGE") && strings.Contains(q, "READING")
		}), mock.MatchedBy(func(p map[string]any) bool {
			return p["user_id"] == "c3d4e5f6-a7b8-9012-cdef-123456789012" && p["text_id"] == "b2c3d4e5-f6a7-8901-bcde-f12345678901"
		})).Return(nil, errors.New("connection refused")).Once()

		totalChapters := 12
		result, upsertErr := progressStore.Upsert(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", "3", &totalChapters, "2026-03-21T10:00:00Z", "[]")

		assert.Nil(t, result)
		assert.ErrorContains(t, upsertErr, "failed to upsert reading progress")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return bad request error when user or text not found", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "MERGE") && strings.Contains(q, "READING")
		}), mock.MatchedBy(func(p map[string]any) bool {
			return p["user_id"] == "c3d4e5f6-a7b8-9012-cdef-123456789012" && p["text_id"] == "nonexistent-text-id"
		})).Return(nil, nil).Once()

		result, upsertErr := progressStore.Upsert(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "nonexistent-text-id", "1", nil, "2026-03-21T10:00:00Z", "[]")

		assert.Nil(t, result)
		appErr, ok := errors.AsType[*apperror.AppError](upsertErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return reading progress when upserted successfully", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		progressStore := NewProgressStore(neo4jKit)

		record := &neo4j.Record{
			Keys: []string{"chapter", "total_chapters", "last_read_at", "session_notes", "text_id", "text_title"},
			Values: []any{
				"3",
				int64(12),
				"2026-03-21T10:00:00Z",
				`[{"date":"2026-03-20T09:00:00Z","chapter":"1","note":"Started"}]`,
				"b2c3d4e5-f6a7-8901-bcde-f12345678901",
				"Republic",
			},
		}
		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "MERGE") && strings.Contains(q, "READING")
		}), mock.MatchedBy(func(p map[string]any) bool {
			return p["user_id"] == "c3d4e5f6-a7b8-9012-cdef-123456789012" &&
				p["chapter"] == "3" &&
				p["total_chapters"] == 12
		})).Return(record, nil).Once()

		totalChapters := 12
		result, upsertErr := progressStore.Upsert(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", "3", &totalChapters, "2026-03-21T10:00:00Z", `[{"date":"2026-03-20T09:00:00Z","chapter":"1","note":"Started"}]`)

		assert.NoError(t, upsertErr)
		assert.Equal(t, "b2c3d4e5-f6a7-8901-bcde-f12345678901", result.TextID)
		assert.Equal(t, "Republic", result.TextTitle)
		assert.Equal(t, "3", result.Chapter)
		assert.Equal(t, 12, *result.TotalChapters)
		assert.Len(t, result.SessionNotes, 1)
		neo4jKit.AssertExpectations(t)
	})
}
