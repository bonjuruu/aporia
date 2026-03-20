package store

import (
	"context"
	"errors"
	"testing"

	neo4jKitMock "github.com/bonjuruu/aporia/internal/kit/neo4j_kit/mock"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestAnnotationStore_Upsert(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to run upsert query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		annotationStore := NewAnnotationStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, errors.New("connection refused")).Once()

		upsertErr := annotationStore.Upsert(ctx, "user-id", "node-id", "agree", "Great argument")

		assert.ErrorContains(t, upsertErr, "failed to upsert annotation")
		neo4jKit.AssertExpectations(t)
	})
}

func TestAnnotationStore_GetByUserID(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to collect annotations", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		annotationStore := NewAnnotationStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.AnythingOfType("string"), map[string]any{"user_id": "user-id"}).Return(nil, errors.New("connection refused")).Once()

		annotationList, getByUserIDErr := annotationStore.GetByUserID(ctx, "user-id")

		assert.Nil(t, annotationList)
		assert.ErrorContains(t, getByUserIDErr, "failed to get annotations")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return annotations when records are returned", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		annotationStore := NewAnnotationStore(neo4jKit)

		record := &neo4j.Record{
			Keys:   []string{"node_id", "stance", "notes"},
			Values: []any{"node-id-1", "agree", "Compelling argument"},
		}
		neo4jKit.On("Collect", ctx, mock.AnythingOfType("string"), map[string]any{"user_id": "user-id"}).Return([]*neo4j.Record{record}, nil).Once()

		annotationList, getByUserIDErr := annotationStore.GetByUserID(ctx, "user-id")

		assert.NoError(t, getByUserIDErr)
		assert.Len(t, annotationList, 1)
		assert.Equal(t, "user-id", annotationList[0].UserID)
		assert.Equal(t, "node-id-1", annotationList[0].NodeID)
		assert.Equal(t, "agree", annotationList[0].Stance)
		assert.Equal(t, "Compelling argument", annotationList[0].Notes)
		neo4jKit.AssertExpectations(t)
	})
}

func TestAnnotationStore_GetByUserAndNode(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get annotation", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		annotationStore := NewAnnotationStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"user_id": "user-id", "node_id": "node-id"}).Return(nil, errors.New("connection refused")).Once()

		annotation, getByUserAndNodeErr := annotationStore.GetByUserAndNode(ctx, "user-id", "node-id")

		assert.Nil(t, annotation)
		assert.ErrorContains(t, getByUserAndNodeErr, "failed to get annotation")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return nil when annotation is not found", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		annotationStore := NewAnnotationStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"user_id": "user-id", "node_id": "node-id"}).Return(nil, nil).Once()

		annotation, getByUserAndNodeErr := annotationStore.GetByUserAndNode(ctx, "user-id", "node-id")

		assert.Nil(t, annotation)
		assert.NoError(t, getByUserAndNodeErr)
		neo4jKit.AssertExpectations(t)
	})
}
