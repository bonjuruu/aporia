package store

import (
	"context"
	"errors"
	"testing"

	neo4jKitMock "github.com/bonjuruu/aporia/internal/kit/neo4j_kit/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestGraphStore_GetFullGraph(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get single record", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		graphStore := NewGraphStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, errors.New("connection refused")).Once()

		graphData, getFullGraphErr := graphStore.GetFullGraph(ctx)

		assert.Nil(t, graphData)
		assert.ErrorContains(t, getFullGraphErr, "failed to get full graph")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return empty graph data when no record is returned", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		graphStore := NewGraphStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil, nil).Once()

		graphData, getFullGraphErr := graphStore.GetFullGraph(ctx)

		assert.NotNil(t, graphData)
		assert.Empty(t, graphData.Nodes)
		assert.Empty(t, graphData.Edges)
		assert.NoError(t, getFullGraphErr)
		neo4jKit.AssertExpectations(t)
	})
}

func TestGraphStore_GetSubgraph(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get subgraph", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		graphStore := NewGraphStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"text_id": "text-id"}).Return(nil, errors.New("connection refused")).Once()

		graphData, getSubgraphErr := graphStore.GetSubgraph(ctx, "text-id")

		assert.Nil(t, graphData)
		assert.ErrorContains(t, getSubgraphErr, "failed to get subgraph")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return empty graph data when no record is returned for subgraph", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		graphStore := NewGraphStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"text_id": "text-id"}).Return(nil, nil).Once()

		graphData, getSubgraphErr := graphStore.GetSubgraph(ctx, "text-id")

		assert.NotNil(t, graphData)
		assert.Empty(t, graphData.Nodes)
		assert.Empty(t, graphData.Edges)
		assert.NoError(t, getSubgraphErr)
		neo4jKit.AssertExpectations(t)
	})
}

func TestGraphStore_GetPath(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get path", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		graphStore := NewGraphStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"from_id": "from-id", "to_id": "to-id"}).Return(nil, errors.New("no path found")).Once()

		graphData, getPathErr := graphStore.GetPath(ctx, "from-id", "to-id")

		assert.Nil(t, graphData)
		assert.ErrorContains(t, getPathErr, "failed to get path")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return empty graph data when no path exists between nodes", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		graphStore := NewGraphStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.AnythingOfType("string"), map[string]any{"from_id": "from-id", "to_id": "to-id"}).Return(nil, nil).Once()

		graphData, getPathErr := graphStore.GetPath(ctx, "from-id", "to-id")

		assert.NotNil(t, graphData)
		assert.Empty(t, graphData.Nodes)
		assert.Empty(t, graphData.Edges)
		assert.NoError(t, getPathErr)
		neo4jKit.AssertExpectations(t)
	})
}
