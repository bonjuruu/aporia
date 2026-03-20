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

func TestNodeService_GetNode(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	nodeStore := storeMock.NewNodeStore(t)
	nodeService := NewNodeService(nodeStore)

	t.Run("Should return error when id is empty", func(t *testing.T) {
		result, getNodeErr := nodeService.GetNode(ctx, "")

		assert.Nil(t, result)
		assert.EqualError(t, getNodeErr, "id is required")
		nodeStore.AssertNotCalled(t, "GetByID")
	})

	t.Run("Should return error when store fails to get node by id", func(t *testing.T) {
		nodeStore.On("GetByID", ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890").Return(nil, errors.New("connection refused")).Once()

		result, getNodeErr := nodeService.GetNode(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.Nil(t, result)
		assert.EqualError(t, getNodeErr, "connection refused")
		nodeStore.AssertExpectations(t)
	})
}

func TestNodeService_CreateNode(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	nodeStore := storeMock.NewNodeStore(t)
	nodeService := NewNodeService(nodeStore)

	t.Run("Should return error when node type is invalid", func(t *testing.T) {
		createNodeRequest := request.CreateNodeRequest{
			Type: "INVALID",
			Name: "Plato",
		}

		result, createNodeErr := nodeService.CreateNode(ctx, createNodeRequest)

		assert.Nil(t, result)
		assert.Error(t, createNodeErr)
		nodeStore.AssertNotCalled(t, "CreateThinker")
	})

	t.Run("Should return error when name is missing for thinker", func(t *testing.T) {
		createNodeRequest := request.CreateNodeRequest{
			Type: models.NodeTypeThinker,
		}

		result, createNodeErr := nodeService.CreateNode(ctx, createNodeRequest)

		assert.Nil(t, result)
		assert.Error(t, createNodeErr)
		nodeStore.AssertNotCalled(t, "CreateThinker")
	})

	t.Run("Should return error when title is missing for text", func(t *testing.T) {
		createNodeRequest := request.CreateNodeRequest{
			Type: models.NodeTypeText,
		}

		result, createNodeErr := nodeService.CreateNode(ctx, createNodeRequest)

		assert.Nil(t, result)
		assert.Error(t, createNodeErr)
		nodeStore.AssertNotCalled(t, "CreateText")
	})

	t.Run("Should return error when content is missing for claim", func(t *testing.T) {
		createNodeRequest := request.CreateNodeRequest{
			Type: models.NodeTypeClaim,
		}

		result, createNodeErr := nodeService.CreateNode(ctx, createNodeRequest)

		assert.Nil(t, result)
		assert.Error(t, createNodeErr)
		nodeStore.AssertNotCalled(t, "CreateClaim")
	})

	t.Run("Should return error when store fails to create thinker", func(t *testing.T) {
		createNodeRequest := request.CreateNodeRequest{
			Type: models.NodeTypeThinker,
			Name: "Aristotle",
		}

		nodeStore.On("CreateThinker", ctx, mock.AnythingOfType("models.Thinker")).Return(nil, errors.New("constraint violation")).Once()

		result, createNodeErr := nodeService.CreateNode(ctx, createNodeRequest)

		assert.Nil(t, result)
		assert.EqualError(t, createNodeErr, "constraint violation")
		nodeStore.AssertExpectations(t)
	})
}

func TestNodeService_UpdateNode(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	nodeStore := storeMock.NewNodeStore(t)
	nodeService := NewNodeService(nodeStore)

	t.Run("Should return error when id is empty", func(t *testing.T) {
		updateNodeRequest := request.UpdateNodeRequest{
			Type: models.NodeTypeThinker,
		}

		updateNodeErr := nodeService.UpdateNode(ctx, "", updateNodeRequest)

		assert.EqualError(t, updateNodeErr, "id is required")
		nodeStore.AssertNotCalled(t, "UpdateThinker")
	})

	t.Run("Should return error when node type is invalid", func(t *testing.T) {
		updateNodeRequest := request.UpdateNodeRequest{
			Type: "INVALID",
		}

		updateNodeErr := nodeService.UpdateNode(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateNodeRequest)

		assert.Error(t, updateNodeErr)
		nodeStore.AssertNotCalled(t, "UpdateThinker")
	})

	t.Run("Should return error when store fails to update thinker", func(t *testing.T) {
		name := "Socrates Updated"
		updateNodeRequest := request.UpdateNodeRequest{
			Type: models.NodeTypeThinker,
			Name: &name,
		}

		nodeStore.On("UpdateThinker", ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", mock.AnythingOfType("models.ThinkerUpdate")).Return(errors.New("node not found")).Once()

		updateNodeErr := nodeService.UpdateNode(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890", updateNodeRequest)

		assert.EqualError(t, updateNodeErr, "node not found")
		nodeStore.AssertExpectations(t)
	})
}

func TestNodeService_DeleteNode(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	nodeStore := storeMock.NewNodeStore(t)
	nodeService := NewNodeService(nodeStore)

	t.Run("Should return error when id is empty", func(t *testing.T) {
		deleteNodeErr := nodeService.DeleteNode(ctx, "")

		assert.EqualError(t, deleteNodeErr, "id is required")
		nodeStore.AssertNotCalled(t, "Delete")
	})

	t.Run("Should return error when store fails to delete node", func(t *testing.T) {
		nodeStore.On("Delete", ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890").Return(errors.New("connection refused")).Once()

		deleteNodeErr := nodeService.DeleteNode(ctx, "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

		assert.EqualError(t, deleteNodeErr, "connection refused")
		nodeStore.AssertExpectations(t)
	})
}

func TestNodeService_Search(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	nodeStore := storeMock.NewNodeStore(t)
	nodeService := NewNodeService(nodeStore)

	t.Run("Should return error when query is empty", func(t *testing.T) {
		result, searchErr := nodeService.Search(ctx, "")

		assert.Nil(t, result)
		assert.EqualError(t, searchErr, "query is required")
		nodeStore.AssertNotCalled(t, "Search")
	})

	t.Run("Should return error when store fails to search", func(t *testing.T) {
		nodeStore.On("Search", ctx, "plato*").Return(nil, errors.New("index unavailable")).Once()

		result, searchErr := nodeService.Search(ctx, "plato")

		assert.Nil(t, result)
		assert.EqualError(t, searchErr, "index unavailable")
		nodeStore.AssertExpectations(t)
	})
}
