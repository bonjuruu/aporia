package service

import (
	"context"
	"log/slog"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/store"
)

type AnnotationService struct {
	annotationStore store.AnnotationStore
}

func NewAnnotationService(annotationStore store.AnnotationStore) *AnnotationService {
	return &AnnotationService{annotationStore: annotationStore}
}

func (s *AnnotationService) GetByUserID(ctx context.Context, userID string) ([]models.UserAnnotation, error) {
	if userID == "" {
		return nil, apperror.NewBadRequest("user id is required")
	}
	return s.annotationStore.GetByUserID(ctx, userID)
}

func (s *AnnotationService) Upsert(ctx context.Context, userID, nodeID string, req request.AnnotationRequest) error {
	if userID == "" {
		return apperror.NewBadRequest("user id is required")
	}
	if nodeID == "" {
		return apperror.NewBadRequest("node id is required")
	}
	if validateErr := validate.Struct(req); validateErr != nil {
		return apperror.NewBadRequest(validateErr.Error())
	}

	upsertErr := s.annotationStore.Upsert(ctx, userID, nodeID, req.Stance, req.Notes)
	if upsertErr != nil {
		slog.Error("failed to upsert annotation", "userID", userID, "nodeID", nodeID, "stance", req.Stance, "error", upsertErr)
		return upsertErr
	}

	slog.Info("annotation upserted", "userID", userID, "nodeID", nodeID, "stance", req.Stance)
	return nil
}
