package service

import (
	"context"
	"errors"
	"testing"

	storeMock "github.com/bonjuruu/aporia/internal/store/mock"
	"github.com/stretchr/testify/assert"
)

func TestGraphService_GetSubgraph(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	graphStore := storeMock.NewGraphStore(t)
	graphService := NewGraphService(graphStore)

	t.Run("Should return error when text id is empty", func(t *testing.T) {
		result, getSubgraphErr := graphService.GetSubgraph(ctx, "")

		assert.Nil(t, result)
		assert.EqualError(t, getSubgraphErr, "text id is required")
		graphStore.AssertNotCalled(t, "GetSubgraph")
	})

	t.Run("Should return error when store fails to get subgraph", func(t *testing.T) {
		graphStore.On("GetSubgraph", ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890").Return(nil, errors.New("connection refused")).Once()

		result, getSubgraphErr := graphService.GetSubgraph(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.Nil(t, result)
		assert.EqualError(t, getSubgraphErr, "connection refused")
		graphStore.AssertExpectations(t)
	})
}

func TestGraphService_GetPath(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	graphStore := storeMock.NewGraphStore(t)
	graphService := NewGraphService(graphStore)

	t.Run("Should return error when from id is empty", func(t *testing.T) {
		result, getPathErr := graphService.GetPath(ctx, "", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.Nil(t, result)
		assert.EqualError(t, getPathErr, "from id is required")
		graphStore.AssertNotCalled(t, "GetPath")
	})

	t.Run("Should return error when to id is empty", func(t *testing.T) {
		result, getPathErr := graphService.GetPath(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "")

		assert.Nil(t, result)
		assert.EqualError(t, getPathErr, "to id is required")
		graphStore.AssertNotCalled(t, "GetPath")
	})

	t.Run("Should return error when store fails to get path", func(t *testing.T) {
		graphStore.On("GetPath", ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6a7-8901-bcde-f12345678901").Return(nil, errors.New("no path found")).Once()

		result, getPathErr := graphService.GetPath(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.Nil(t, result)
		assert.EqualError(t, getPathErr, "no path found")
		graphStore.AssertExpectations(t)
	})
}
