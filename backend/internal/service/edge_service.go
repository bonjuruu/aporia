package service

import (
	"context"
	"log/slog"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/store"
	"github.com/google/uuid"
)

type EdgeService struct {
	edgeStore store.EdgeStore
}

func NewEdgeService(edgeStore store.EdgeStore) *EdgeService {
	return &EdgeService{edgeStore: edgeStore}
}

func (s *EdgeService) CreateEdge(ctx context.Context, req request.CreateEdgeRequest) (*models.Edge, error) {
	if validateErr := validate.Struct(req); validateErr != nil {
		return nil, apperror.NewBadRequest(validateErr.Error())
	}

	id := uuid.New().String()
	edge, createErr := s.edgeStore.Create(ctx, id, req.Type, req.Source, req.Target, req.Description, req.SourceTextID)
	if createErr != nil {
		slog.Error("failed to create edge", "id", id, "type", req.Type, "source", req.Source, "target", req.Target, "error", createErr)
		return nil, createErr
	}

	slog.Info("edge created", "id", id, "type", req.Type, "source", req.Source, "target", req.Target)
	return edge, nil
}

func (s *EdgeService) UpdateEdge(ctx context.Context, id string, req request.UpdateEdgeRequest) error {
	if id == "" {
		return apperror.NewBadRequest("id is required")
	}

	if req.Description == nil && req.SourceTextID == nil {
		return apperror.NewBadRequest("no fields to update")
	}

	update := models.EdgeUpdate{
		Description:  req.Description,
		SourceTextID: req.SourceTextID,
	}

	updateErr := s.edgeStore.Update(ctx, id, update)
	if updateErr != nil {
		slog.Error("failed to update edge", "id", id, "error", updateErr)
		return updateErr
	}

	slog.Info("edge updated", "id", id)
	return nil
}

func (s *EdgeService) DeleteEdge(ctx context.Context, id string) error {
	if id == "" {
		return apperror.NewBadRequest("id is required")
	}

	deleteErr := s.edgeStore.Delete(ctx, id)
	if deleteErr != nil {
		slog.Error("failed to delete edge", "id", id, "error", deleteErr)
		return deleteErr
	}

	slog.Info("edge deleted", "id", id)
	return nil
}
