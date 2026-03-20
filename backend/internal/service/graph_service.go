package service

import (
	"context"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/store"
)

type GraphService struct {
	graphStore store.GraphStore
}

func NewGraphService(graphStore store.GraphStore) *GraphService {
	return &GraphService{graphStore: graphStore}
}

func (s *GraphService) GetFullGraph(ctx context.Context) (*response.GraphData, error) {
	return s.graphStore.GetFullGraph(ctx)
}

func (s *GraphService) GetSubgraph(ctx context.Context, textID string) (*response.GraphData, error) {
	if textID == "" {
		return nil, apperror.NewBadRequest("text id is required")
	}
	return s.graphStore.GetSubgraph(ctx, textID)
}

func (s *GraphService) GetPath(ctx context.Context, fromID, toID string) (*response.GraphData, error) {
	if fromID == "" {
		return nil, apperror.NewBadRequest("from id is required")
	}
	if toID == "" {
		return nil, apperror.NewBadRequest("to id is required")
	}
	return s.graphStore.GetPath(ctx, fromID, toID)
}
