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

func TestEdgeStore_Create(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when edge type is invalid", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		edgeStore := NewEdgeStore(neo4jKit)

		edge, createErr := edgeStore.Create(ctx, "edge-id", "INVALID_TYPE", "source-id", "target-id", "description", "")

		assert.Nil(t, edge)
		assert.ErrorContains(t, createErr, "invalid edge type")
		neo4jKit.AssertNotCalled(t, "Single")
	})

	t.Run("Should return error when neo4j kit fails to run create query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		edgeStore := NewEdgeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, errors.New("node not found")).Once()

		edge, createErr := edgeStore.Create(ctx, "edge-id", models.EdgeTypeInfluenced, "source-id", "target-id", "Plato influenced Aristotle", "")

		assert.Nil(t, edge)
		assert.ErrorContains(t, createErr, "failed to create edge")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when source or target node does not exist", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		edgeStore := NewEdgeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, nil).Once()

		edge, createErr := edgeStore.Create(ctx, "edge-id", models.EdgeTypeInfluenced, "source-id", "nonexistent-id", "description", "")

		assert.Nil(t, edge)
		createAppErr, ok := errors.AsType[*apperror.AppError](createErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, createAppErr.Status)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return edge when created successfully", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		edgeStore := NewEdgeStore(neo4jKit)

		record := &neo4j.Record{
			Keys:   []string{"r"},
			Values: []any{"edge-id"},
		}
		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(record, nil).Once()

		edge, createErr := edgeStore.Create(ctx, "edge-id", models.EdgeTypeInfluenced, "source-id", "target-id", "Plato influenced Aristotle", "text-id")

		assert.NoError(t, createErr)
		assert.Equal(t, "edge-id", edge.ID)
		assert.Equal(t, "source-id", edge.Source)
		assert.Equal(t, "target-id", edge.Target)
		assert.Equal(t, models.EdgeTypeInfluenced, edge.Type)
		assert.Equal(t, "Plato influenced Aristotle", edge.Description)
		assert.Equal(t, "text-id", edge.SourceTextID)
		neo4jKit.AssertExpectations(t)
	})
}

func TestEdgeStore_Update(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to run update query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		edgeStore := NewEdgeStore(neo4jKit)

		description := "updated description"
		edgeUpdate := models.EdgeUpdate{Description: &description}

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, errors.New("connection refused")).Once()

		updateErr := edgeStore.Update(ctx, "edge-id", edgeUpdate)

		assert.ErrorContains(t, updateErr, "failed to update edge")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when edge does not exist", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		edgeStore := NewEdgeStore(neo4jKit)

		description := "updated description"
		edgeUpdate := models.EdgeUpdate{Description: &description}

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, nil).Once()

		updateErr := edgeStore.Update(ctx, "edge-id", edgeUpdate)

		updateAppErr, ok := errors.AsType[*apperror.AppError](updateErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, updateAppErr.Status)
		neo4jKit.AssertExpectations(t)
	})
}

func TestEdgeStore_Delete(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to run delete query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		edgeStore := NewEdgeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"id": "edge-id"}).Return(nil, errors.New("connection refused")).Once()

		deleteErr := edgeStore.Delete(ctx, "edge-id")

		assert.ErrorContains(t, deleteErr, "failed to delete edge")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when edge does not exist", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		edgeStore := NewEdgeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"id": "nonexistent-id"}).Return(nil, nil).Once()

		deleteErr := edgeStore.Delete(ctx, "nonexistent-id")

		deleteAppErr, ok := errors.AsType[*apperror.AppError](deleteErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, deleteAppErr.Status)
		neo4jKit.AssertExpectations(t)
	})
}
