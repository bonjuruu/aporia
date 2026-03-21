package store

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	neo4jKitMock "github.com/bonjuruu/aporia/internal/kit/neo4j_kit/mock"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestQuoteStore_Create(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	// Create params contain a non-deterministic created_at timestamp, so mock.Anything is correct here

	t.Run("Should return error when neo4j kit fails to run create query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		quote := models.Quote{
			ID:           "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Content:      "The unexamined life is not worth living.",
			SourceTextID: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
		}

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, errors.New("connection refused")).Once()

		result, createErr := quoteStore.Create(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", quote)

		assert.Nil(t, result)
		assert.ErrorContains(t, createErr, "failed to create quote")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return bad request error when user or source text not found", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		quote := models.Quote{
			ID:           "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Content:      "The unexamined life is not worth living.",
			SourceTextID: "nonexistent-text-id",
		}

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, nil).Once()

		result, createErr := quoteStore.Create(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", quote)

		assert.Nil(t, result)
		appErr, ok := errors.AsType[*apperror.AppError](createErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return quote when created successfully", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		quote := models.Quote{
			ID:           "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Content:      "The unexamined life is not worth living.",
			SourceTextID: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			Reaction:     "Foundational claim",
		}

		record := &neo4j.Record{
			Keys: []string{"id", "content", "page", "reaction", "status", "created_at", "source_text_id", "source_text_title"},
			Values: []any{
				"a1b2c3d4-e5f6-7890-abcd-ef1234567890",
				"The unexamined life is not worth living.",
				nil,
				"Foundational claim",
				"raw",
				"2026-03-21T10:00:00Z",
				"b2c3d4e5-f6a7-8901-bcde-f12345678901",
				"Apology",
			},
		}
		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(record, nil).Once()

		result, createErr := quoteStore.Create(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", quote)

		assert.NoError(t, createErr)
		assert.Equal(t, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", result.ID)
		assert.Equal(t, "The unexamined life is not worth living.", result.Content)
		assert.Equal(t, "b2c3d4e5-f6a7-8901-bcde-f12345678901", result.SourceTextID)
		assert.Equal(t, "Apology", result.SourceTextTitle)
		assert.Nil(t, result.Page)
		assert.Equal(t, "Foundational claim", result.Reaction)
		assert.Equal(t, models.QuoteStatusRaw, result.Status)
		neo4jKit.AssertExpectations(t)
	})
}

func TestQuoteStore_ListByUser(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to collect quotes", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.AnythingOfType("string"), map[string]any{"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"}).Return(nil, errors.New("connection refused")).Once()

		quoteList, listErr := quoteStore.ListByUser(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "")

		assert.Nil(t, quoteList)
		assert.ErrorContains(t, listErr, "failed to list quotes")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return empty list when no quotes found", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.AnythingOfType("string"), map[string]any{"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"}).Return([]*neo4j.Record{}, nil).Once()

		quoteList, listErr := quoteStore.ListByUser(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "")

		assert.Empty(t, quoteList)
		assert.NoError(t, listErr)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return quotes when records are returned", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		record := &neo4j.Record{
			Keys: []string{"id", "content", "page", "reaction", "status", "created_at", "promoted_node_id", "source_text_id", "source_text_title"},
			Values: []any{
				"a1b2c3d4-e5f6-7890-abcd-ef1234567890",
				"Know thyself.",
				int64(42),
				"pithy",
				"raw",
				"2026-03-21T10:00:00Z",
				"",
				"b2c3d4e5-f6a7-8901-bcde-f12345678901",
				"Apology",
			},
		}
		neo4jKit.On("Collect", ctx, mock.AnythingOfType("string"), map[string]any{"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"}).Return([]*neo4j.Record{record}, nil).Once()

		quoteList, listErr := quoteStore.ListByUser(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "")

		assert.NoError(t, listErr)
		assert.Len(t, quoteList, 1)
		assert.Equal(t, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", quoteList[0].ID)
		assert.Equal(t, "Know thyself.", quoteList[0].Content)
		assert.Equal(t, 42, *quoteList[0].Page)
		assert.Equal(t, "pithy", quoteList[0].Reaction)
		assert.Equal(t, models.QuoteStatusRaw, quoteList[0].Status)
		assert.Equal(t, "Apology", quoteList[0].SourceTextTitle)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should include text id filter in query params when text id is provided", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.AnythingOfType("string"), map[string]any{"user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "text_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901"}).Return([]*neo4j.Record{}, nil).Once()

		quoteList, listErr := quoteStore.ListByUser(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.NoError(t, listErr)
		assert.Empty(t, quoteList)
		neo4jKit.AssertExpectations(t)
	})
}

func TestQuoteStore_Update(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to run update query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		reaction := "disagree"
		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "reaction": "disagree"}).Return(nil, errors.New("connection refused")).Once()

		updateErr := quoteStore.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", &reaction, nil)

		assert.ErrorContains(t, updateErr, "failed to update quote")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when quote does not exist or user does not own it", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		reaction := "disagree"
		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"id": "nonexistent-id", "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "reaction": "disagree"}).Return(nil, nil).Once()

		updateErr := quoteStore.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "nonexistent-id", &reaction, nil)

		appErr, ok := errors.AsType[*apperror.AppError](updateErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return bad request error when no fields to update", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		updateErr := quoteStore.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", nil, nil)

		appErr, ok := errors.AsType[*apperror.AppError](updateErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, appErr.Status)
		neo4jKit.AssertNotCalled(t, "Single")
	})

	t.Run("Should include both reaction and page in update params when both are provided", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		reaction := "insightful"
		page := 42

		record := &neo4j.Record{
			Keys:   []string{"id"},
			Values: []any{"a1b2c3d4-e5f6-7890-abcd-ef1234567890"},
		}

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "reaction": "insightful", "page": 42}).Return(record, nil).Once()

		updateErr := quoteStore.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", &reaction, &page)

		assert.NoError(t, updateErr)
		neo4jKit.AssertExpectations(t)
	})
}

func TestQuoteStore_Delete(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to run delete query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"}).Return(nil, errors.New("connection refused")).Once()

		deleteErr := quoteStore.Delete(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.ErrorContains(t, deleteErr, "failed to delete quote")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when quote does not exist or user does not own it", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"id": "nonexistent-id", "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"}).Return(nil, nil).Once()

		deleteErr := quoteStore.Delete(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "nonexistent-id")

		appErr, ok := errors.AsType[*apperror.AppError](deleteErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})
}

func TestQuoteStore_Promote(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when label is invalid", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		result, promoteErr := quoteStore.Promote(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "INVALID", map[string]any{"id": "test"})

		assert.Nil(t, result)
		appErr, ok := errors.AsType[*apperror.AppError](promoteErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, appErr.Status)
		neo4jKit.AssertNotCalled(t, "Single")
	})

	t.Run("Should return error when neo4j kit fails to run promote query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		promoteProps := map[string]any{
			"id":      "d4e5f6a7-b890-1234-abcd-ef5678901234",
			"content": "The unexamined life is not worth living.",
			"notes":   "",
			"year":    nil,
		}

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"quote_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "props": promoteProps}).Return(nil, errors.New("connection refused")).Once()

		result, promoteErr := quoteStore.Promote(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Claim", promoteProps)

		assert.Nil(t, result)
		assert.ErrorContains(t, promoteErr, "failed to promote quote")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when quote does not exist", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		promoteProps := map[string]any{
			"id":      "d4e5f6a7-b890-1234-abcd-ef5678901234",
			"content": "The unexamined life is not worth living.",
			"notes":   "",
			"year":    nil,
		}

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"quote_id": "nonexistent-id", "props": promoteProps}).Return(nil, nil).Once()

		result, promoteErr := quoteStore.Promote(ctx, "nonexistent-id", "Claim", promoteProps)

		assert.Nil(t, result)
		appErr, ok := errors.AsType[*apperror.AppError](promoteErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return graph node when quote is promoted successfully", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		quoteStore := NewQuoteStore(neo4jKit)

		promoteProps := map[string]any{
			"id":      "d4e5f6a7-b890-1234-abcd-ef5678901234",
			"content": "The unexamined life is not worth living.",
			"notes":   "",
			"year":    nil,
		}

		record := &neo4j.Record{
			Keys: []string{"id", "label", "type", "year"},
			Values: []any{
				"d4e5f6a7-b890-1234-abcd-ef5678901234",
				"The unexamined life is not worth living.",
				"CLAIM",
				nil,
			},
		}
		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"quote_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "props": promoteProps}).Return(record, nil).Once()

		result, promoteErr := quoteStore.Promote(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Claim", promoteProps)

		assert.NoError(t, promoteErr)
		assert.Equal(t, "d4e5f6a7-b890-1234-abcd-ef5678901234", result.ID)
		assert.Equal(t, "The unexamined life is not worth living.", result.Label)
		assert.Equal(t, models.NodeTypeClaim, result.Type)
		assert.Nil(t, result.Year)
		neo4jKit.AssertExpectations(t)
	})
}
