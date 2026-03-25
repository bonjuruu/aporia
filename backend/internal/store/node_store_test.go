package store

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	neo4jKitMock "github.com/bonjuruu/aporia/internal/kit/neo4j_kit/mock"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestNodeStore_GetAll(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to collect", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "n:Thinker OR n:Concept OR n:Claim OR n:Text")
		}), (map[string]any)(nil)).Return(nil, errors.New("connection refused")).Once()

		nodeList, getAllErr := nodeStore.GetAll(ctx)

		assert.Nil(t, nodeList)
		assert.ErrorContains(t, getAllErr, "failed to get all nodes")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return empty list when no records returned", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "n:Thinker OR n:Concept OR n:Claim OR n:Text")
		}), (map[string]any)(nil)).Return([]*neo4j.Record{}, nil).Once()

		nodeList, getAllErr := nodeStore.GetAll(ctx)

		assert.Empty(t, nodeList)
		assert.NoError(t, getAllErr)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return graph nodes when records are returned", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		record := &neo4j.Record{
			Keys:   []string{"id", "label", "type", "year"},
			Values: []any{"a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Plato", "THINKER", int64(-428)},
		}
		neo4jKit.On("Collect", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "n:Thinker OR n:Concept OR n:Claim OR n:Text")
		}), (map[string]any)(nil)).Return([]*neo4j.Record{record}, nil).Once()

		nodeList, getAllErr := nodeStore.GetAll(ctx)

		assert.NoError(t, getAllErr)
		assert.Len(t, nodeList, 1)
		assert.Equal(t, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", nodeList[0].ID)
		assert.Equal(t, "Plato", nodeList[0].Label)
		assert.Equal(t, models.NodeTypeThinker, nodeList[0].Type)
		assert.Equal(t, -428, *nodeList[0].Year)
		neo4jKit.AssertExpectations(t)
	})
}

func TestNodeStore_GetByID(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get single record", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "n.id = $id")
		}), map[string]any{"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}).Return(nil, errors.New("connection refused")).Once()

		detail, getByIDErr := nodeStore.GetByID(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.Nil(t, detail)
		assert.ErrorContains(t, getByIDErr, "failed to get node by id")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when no record is found", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "n.id = $id")
		}), map[string]any{"id": "nonexistent-id"}).Return(nil, nil).Once()

		detail, getByIDErr := nodeStore.GetByID(ctx, "nonexistent-id")

		assert.Nil(t, detail)
		appErr, ok := errors.AsType[*apperror.AppError](getByIDErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})
}

func TestNodeStore_CreateThinker(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to run create query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		bornYear := -428
		thinker := models.Thinker{
			ID:          "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Name:        "Plato",
			Description: "Greek philosopher",
			BornYear:    &bornYear,
		}

		expectedParams := map[string]any{
			"id":          "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			"name":        "Plato",
			"description": "Greek philosopher",
			"notes":       "",
			"born_year":   -428,
			"died_year":   nil,
			"tradition":   "",
		}
		neo4jKit.On("Run", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "CREATE (n:Thinker")
		}), expectedParams).Return(errors.New("constraint violation")).Once()

		result, createErr := nodeStore.CreateThinker(ctx, thinker)

		assert.Nil(t, result)
		assert.ErrorContains(t, createErr, "failed to create thinker")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return graph node when thinker is created successfully", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		bornYear := -428
		thinker := models.Thinker{
			ID:       "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Name:     "Plato",
			BornYear: &bornYear,
		}

		expectedParams := map[string]any{
			"id":          "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			"name":        "Plato",
			"description": "",
			"notes":       "",
			"born_year":   -428,
			"died_year":   nil,
			"tradition":   "",
		}
		neo4jKit.On("Run", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "CREATE (n:Thinker")
		}), expectedParams).Return(nil).Once()

		result, createErr := nodeStore.CreateThinker(ctx, thinker)

		assert.NoError(t, createErr)
		assert.Equal(t, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", result.ID)
		assert.Equal(t, "Plato", result.Label)
		assert.Equal(t, models.NodeTypeThinker, result.Type)
		assert.Equal(t, -428, *result.Year)
		neo4jKit.AssertExpectations(t)
	})
}

func TestNodeStore_Delete(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to run delete query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "DETACH DELETE n")
		}), map[string]any{"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}).Return(nil, errors.New("connection refused")).Once()

		deleteErr := nodeStore.Delete(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.ErrorContains(t, deleteErr, "failed to delete node")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when node does not exist", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "DETACH DELETE n")
		}), map[string]any{"id": "nonexistent-id"}).Return(nil, nil).Once()

		deleteErr := nodeStore.Delete(ctx, "nonexistent-id")

		appErr, ok := errors.AsType[*apperror.AppError](deleteErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})
}

func TestNodeStore_Search(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to collect search results", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Collect", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "db.index.fulltext.queryNodes")
		}), map[string]any{"query": "plato"}).Return(nil, errors.New("index unavailable")).Once()

		nodeList, searchErr := nodeStore.Search(ctx, "plato")

		assert.Nil(t, nodeList)
		assert.ErrorContains(t, searchErr, "failed to search nodes")
		neo4jKit.AssertExpectations(t)
	})
}

func TestNodeStore_Count(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get count", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "count(n) as count")
		}), (map[string]any)(nil)).Return(nil, errors.New("connection refused")).Once()

		count, countErr := nodeStore.Count(ctx)

		assert.Nil(t, count)
		assert.ErrorContains(t, countErr, "failed to count nodes")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return zero when no record is returned", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "count(n) as count")
		}), (map[string]any)(nil)).Return(nil, nil).Once()

		count, countErr := nodeStore.Count(ctx)

		assert.Equal(t, int64(0), *count)
		assert.NoError(t, countErr)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return count when record contains valid count", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		nodeStore := NewNodeStore(neo4jKit)

		record := &neo4j.Record{
			Keys:   []string{"count"},
			Values: []any{int64(23)},
		}
		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "count(n) as count")
		}), (map[string]any)(nil)).Return(record, nil).Once()

		count, countErr := nodeStore.Count(ctx)

		assert.Equal(t, int64(23), *count)
		assert.NoError(t, countErr)
		neo4jKit.AssertExpectations(t)
	})
}
