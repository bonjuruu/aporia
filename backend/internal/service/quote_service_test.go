package service

import (
	"context"
	"errors"
	"testing"

	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/response"
	storeMock "github.com/bonjuruu/aporia/internal/store/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestQuoteService_Capture(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when user id is empty", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		createQuoteRequest := request.CreateQuoteRequest{
			Content:      "The unexamined life is not worth living.",
			SourceTextID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		}

		result, captureErr := quoteService.Capture(ctx, "", createQuoteRequest)

		assert.Nil(t, result)
		assert.EqualError(t, captureErr, "user id is required")
		quoteStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when content is missing", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		createQuoteRequest := request.CreateQuoteRequest{
			SourceTextID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		}

		result, captureErr := quoteService.Capture(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", createQuoteRequest)

		assert.Nil(t, result)
		assert.Error(t, captureErr)
		quoteStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when page is zero", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		page := 0
		createQuoteRequest := request.CreateQuoteRequest{
			Content:      "The unexamined life is not worth living.",
			SourceTextID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Page:         &page,
		}

		result, captureErr := quoteService.Capture(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", createQuoteRequest)

		assert.Nil(t, result)
		assert.Error(t, captureErr)
		quoteStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when page is negative", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		page := -3
		createQuoteRequest := request.CreateQuoteRequest{
			Content:      "The unexamined life is not worth living.",
			SourceTextID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Page:         &page,
		}

		result, captureErr := quoteService.Capture(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", createQuoteRequest)

		assert.Nil(t, result)
		assert.Error(t, captureErr)
		quoteStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when source text id is missing", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		createQuoteRequest := request.CreateQuoteRequest{
			Content: "The unexamined life is not worth living.",
		}

		result, captureErr := quoteService.Capture(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", createQuoteRequest)

		assert.Nil(t, result)
		assert.Error(t, captureErr)
		quoteStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when quote store fails to create quote", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		createQuoteRequest := request.CreateQuoteRequest{
			Content:      "The unexamined life is not worth living.",
			SourceTextID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		}

		quoteStore.On("Create", ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", mock.MatchedBy(func(q models.Quote) bool { return q.Content != "" })).
			Run(func(args mock.Arguments) {
				quote := args.Get(2).(models.Quote)
				assert.NotEmpty(t, quote.ID)
				assert.Equal(t, "The unexamined life is not worth living.", quote.Content)
				assert.Equal(t, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", quote.SourceTextID)
				assert.Nil(t, quote.Page)
				assert.Empty(t, quote.Reaction)
				assert.Equal(t, models.QuoteStatusRaw, quote.Status)
			}).Return(nil, errors.New("user or source text not found")).Once()

		result, captureErr := quoteService.Capture(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", createQuoteRequest)

		assert.Nil(t, result)
		assert.EqualError(t, captureErr, "user or source text not found")
		quoteStore.AssertExpectations(t)
	})
}

func TestQuoteService_List(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when user id is empty", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		result, listErr := quoteService.List(ctx, "", "")

		assert.Nil(t, result)
		assert.EqualError(t, listErr, "user id is required")
		quoteStore.AssertNotCalled(t, "ListByUser")
	})

	t.Run("Should return error when quote store fails to list quotes", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		quoteStore.On("ListByUser", ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "").Return(nil, errors.New("connection refused")).Once()

		result, listErr := quoteService.List(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "")

		assert.Nil(t, result)
		assert.EqualError(t, listErr, "connection refused")
		quoteStore.AssertExpectations(t)
	})
}

func TestQuoteService_Update(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when user id is empty", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		reaction := "interesting"
		updateQuoteRequest := request.UpdateQuoteRequest{
			Reaction: &reaction,
		}

		updateErr := quoteService.Update(ctx, "", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateQuoteRequest)

		assert.EqualError(t, updateErr, "user id is required")
		quoteStore.AssertNotCalled(t, "Update")
	})

	t.Run("Should return error when quote id is empty", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		reaction := "interesting"
		updateQuoteRequest := request.UpdateQuoteRequest{
			Reaction: &reaction,
		}

		updateErr := quoteService.Update(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "", updateQuoteRequest)

		assert.EqualError(t, updateErr, "quote id is required")
		quoteStore.AssertNotCalled(t, "Update")
	})

	t.Run("Should return error when update page is zero", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		page := 0
		updateQuoteRequest := request.UpdateQuoteRequest{
			Page: &page,
		}

		updateErr := quoteService.Update(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateQuoteRequest)

		assert.Error(t, updateErr)
		quoteStore.AssertNotCalled(t, "Update")
	})

	t.Run("Should return error when update page is negative", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		page := -5
		updateQuoteRequest := request.UpdateQuoteRequest{
			Page: &page,
		}

		updateErr := quoteService.Update(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateQuoteRequest)

		assert.Error(t, updateErr)
		quoteStore.AssertNotCalled(t, "Update")
	})

	t.Run("Should return error when no fields to update", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		updateQuoteRequest := request.UpdateQuoteRequest{}

		updateErr := quoteService.Update(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateQuoteRequest)

		assert.EqualError(t, updateErr, "no fields to update")
		quoteStore.AssertNotCalled(t, "Update")
	})

	t.Run("Should return error when quote store fails to update quote", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		reaction := "disagree"
		updateQuoteRequest := request.UpdateQuoteRequest{
			Reaction: &reaction,
		}

		quoteStore.On("Update", ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", &reaction, (*int)(nil)).Return(errors.New("quote not found")).Once()

		updateErr := quoteService.Update(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateQuoteRequest)

		assert.EqualError(t, updateErr, "quote not found")
		quoteStore.AssertExpectations(t)
	})
}

func TestQuoteService_Delete(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when user id is empty", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		deleteErr := quoteService.Delete(ctx, "", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.EqualError(t, deleteErr, "user id is required")
		quoteStore.AssertNotCalled(t, "Delete")
	})

	t.Run("Should return error when quote id is empty", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		deleteErr := quoteService.Delete(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "")

		assert.EqualError(t, deleteErr, "quote id is required")
		quoteStore.AssertNotCalled(t, "Delete")
	})

	t.Run("Should return error when quote store fails to delete quote", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		quoteStore.On("Delete", ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890").Return(errors.New("quote not found")).Once()

		deleteErr := quoteService.Delete(ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.EqualError(t, deleteErr, "quote not found")
		quoteStore.AssertExpectations(t)
	})
}

func TestQuoteService_Promote(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when quote id is empty", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		nodeRequest := request.CreateNodeRequest{
			Type:    models.NodeTypeClaim,
			Content: "The unexamined life is not worth living.",
		}

		result, promoteErr := quoteService.Promote(ctx, "", "b2c3d4e5-f6a7-8901-bcde-f12345678901", nodeRequest)

		assert.Nil(t, result)
		assert.EqualError(t, promoteErr, "quote id is required")
		quoteStore.AssertNotCalled(t, "Promote")
	})

	t.Run("Should return error when user id is empty", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		nodeRequest := request.CreateNodeRequest{
			Type:    models.NodeTypeClaim,
			Content: "The unexamined life is not worth living.",
		}

		result, promoteErr := quoteService.Promote(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "", nodeRequest)

		assert.Nil(t, result)
		assert.EqualError(t, promoteErr, "user id is required")
		quoteStore.AssertNotCalled(t, "Promote")
	})

	t.Run("Should return error when node type is invalid", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		nodeRequest := request.CreateNodeRequest{
			Type:    "INVALID",
			Content: "The unexamined life is not worth living.",
		}

		result, promoteErr := quoteService.Promote(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6a7-8901-bcde-f12345678901", nodeRequest)

		assert.Nil(t, result)
		assert.Error(t, promoteErr)
		quoteStore.AssertNotCalled(t, "Promote")
	})

	t.Run("Should return error when quote store fails to promote quote", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		nodeRequest := request.CreateNodeRequest{
			Type:    models.NodeTypeClaim,
			Content: "The unexamined life is not worth living.",
		}

		quoteStore.On("Promote", ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Claim", mock.MatchedBy(func(p map[string]any) bool { return true })).
			Run(func(args mock.Arguments) {
				props := args.Get(4).(map[string]any)
				assert.NotEmpty(t, props["id"])
				assert.Equal(t, "The unexamined life is not worth living.", props["content"])
				assert.Equal(t, "", props["notes"])
				assert.Nil(t, props["year"])
			}).Return(nil, errors.New("quote not found")).Once()

		result, promoteErr := quoteService.Promote(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6a7-8901-bcde-f12345678901", nodeRequest)

		assert.Nil(t, result)
		assert.EqualError(t, promoteErr, "quote not found")
		quoteStore.AssertExpectations(t)
	})

	t.Run("Should return graph node when quote store successfully promotes quote to claim", func(t *testing.T) {
		quoteStore := storeMock.NewQuoteStore(t)
		quoteService := NewQuoteService(quoteStore)

		nodeRequest := request.CreateNodeRequest{
			Type:    models.NodeTypeClaim,
			Content: "The unexamined life is not worth living.",
		}

		promotedNode := &response.GraphNode{
			ID:    "c3d4e5f6-a7b8-9012-cdef-123456789012",
			Label: "The unexamined life is not worth living.",
			Type:  models.NodeTypeClaim,
		}

		quoteStore.On("Promote", ctx, "b2c3d4e5-f6a7-8901-bcde-f12345678901", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Claim", mock.MatchedBy(func(p map[string]any) bool { return true })).
			Run(func(args mock.Arguments) {
				props := args.Get(4).(map[string]any)
				assert.NotEmpty(t, props["id"])
				assert.Equal(t, "The unexamined life is not worth living.", props["content"])
				assert.Equal(t, "", props["notes"])
				assert.Nil(t, props["year"])
			}).Return(promotedNode, nil).Once()

		result, promoteErr := quoteService.Promote(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6a7-8901-bcde-f12345678901", nodeRequest)

		assert.NoError(t, promoteErr)
		assert.Equal(t, "c3d4e5f6-a7b8-9012-cdef-123456789012", result.ID)
		assert.Equal(t, "The unexamined life is not worth living.", result.Label)
		assert.Equal(t, models.NodeTypeClaim, result.Type)
		quoteStore.AssertExpectations(t)
	})
}
