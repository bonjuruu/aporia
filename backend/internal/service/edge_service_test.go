package service

import (
	"context"
	"errors"
	"testing"

	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	storeMock "github.com/bonjuruu/aporia/internal/store/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestEdgeService_CreateEdge(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	edgeStore := storeMock.NewEdgeStore(t)
	edgeService := NewEdgeService(edgeStore)

	t.Run("Should return error when edge type is invalid", func(t *testing.T) {
		createEdgeRequest := request.CreateEdgeRequest{
			Source: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Target: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			Type:   "INVALID_TYPE",
		}

		result, createEdgeErr := edgeService.CreateEdge(ctx, createEdgeRequest)

		assert.Nil(t, result)
		assert.Error(t, createEdgeErr)
		edgeStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when source is missing", func(t *testing.T) {
		createEdgeRequest := request.CreateEdgeRequest{
			Target: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			Type:   models.EdgeTypeInfluenced,
		}

		result, createEdgeErr := edgeService.CreateEdge(ctx, createEdgeRequest)

		assert.Nil(t, result)
		assert.Error(t, createEdgeErr)
		edgeStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when target is missing", func(t *testing.T) {
		createEdgeRequest := request.CreateEdgeRequest{
			Source: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Type:   models.EdgeTypeInfluenced,
		}

		result, createEdgeErr := edgeService.CreateEdge(ctx, createEdgeRequest)

		assert.Nil(t, result)
		assert.Error(t, createEdgeErr)
		edgeStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when store fails to create edge", func(t *testing.T) {
		createEdgeRequest := request.CreateEdgeRequest{
			Source: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Target: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			Type:   models.EdgeTypeInfluenced,
		}

		edgeStore.On("Create", ctx, mock.MatchedBy(func(id string) bool { return id != "" }), models.EdgeTypeInfluenced, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6a7-8901-bcde-f12345678901", "", "").Return(nil, errors.New("node not found")).Once()

		result, createEdgeErr := edgeService.CreateEdge(ctx, createEdgeRequest)

		assert.Nil(t, result)
		assert.EqualError(t, createEdgeErr, "node not found")
		edgeStore.AssertExpectations(t)
	})
}

func TestEdgeService_UpdateEdge(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	edgeStore := storeMock.NewEdgeStore(t)
	edgeService := NewEdgeService(edgeStore)

	t.Run("Should return error when id is empty", func(t *testing.T) {
		description := "updated description"
		updateEdgeRequest := request.UpdateEdgeRequest{
			Description: &description,
		}

		updateEdgeErr := edgeService.UpdateEdge(ctx, "", updateEdgeRequest)

		assert.EqualError(t, updateEdgeErr, "id is required")
		edgeStore.AssertNotCalled(t, "Update")
	})

	t.Run("Should return error when no fields to update", func(t *testing.T) {
		updateEdgeRequest := request.UpdateEdgeRequest{}

		updateEdgeErr := edgeService.UpdateEdge(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateEdgeRequest)

		assert.EqualError(t, updateEdgeErr, "no fields to update")
		edgeStore.AssertNotCalled(t, "Update")
	})

	t.Run("Should return error when store fails to update edge", func(t *testing.T) {
		description := "updated description"
		updateEdgeRequest := request.UpdateEdgeRequest{
			Description: &description,
		}

		edgeStore.On("Update", ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", models.EdgeUpdate{Description: &description}).Return(errors.New("edge not found")).Once()

		updateEdgeErr := edgeService.UpdateEdge(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateEdgeRequest)

		assert.EqualError(t, updateEdgeErr, "edge not found")
		edgeStore.AssertExpectations(t)
	})
}

func TestEdgeService_DeleteEdge(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	edgeStore := storeMock.NewEdgeStore(t)
	edgeService := NewEdgeService(edgeStore)

	t.Run("Should return error when id is empty", func(t *testing.T) {
		deleteEdgeErr := edgeService.DeleteEdge(ctx, "")

		assert.EqualError(t, deleteEdgeErr, "id is required")
		edgeStore.AssertNotCalled(t, "Delete")
	})

	t.Run("Should return error when store fails to delete edge", func(t *testing.T) {
		edgeStore.On("Delete", ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890").Return(errors.New("connection refused")).Once()

		deleteEdgeErr := edgeService.DeleteEdge(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.EqualError(t, deleteEdgeErr, "connection refused")
		edgeStore.AssertExpectations(t)
	})
}

