package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/store"
)

type ProgressService struct {
	progressStore store.ProgressStore
}

func NewProgressService(progressStore store.ProgressStore) *ProgressService {
	return &ProgressService{progressStore: progressStore}
}

func (s *ProgressService) Get(ctx context.Context, userID string, textID string) (*models.ReadingProgress, error) {
	if userID == "" {
		return nil, apperror.NewBadRequest("user id is required")
	}
	if textID == "" {
		return nil, apperror.NewBadRequest("text id is required")
	}
	return s.progressStore.Get(ctx, userID, textID)
}

func (s *ProgressService) List(ctx context.Context, userID string) ([]*models.ReadingProgress, error) {
	if userID == "" {
		return nil, apperror.NewBadRequest("user id is required")
	}
	return s.progressStore.List(ctx, userID)
}

func (s *ProgressService) Update(ctx context.Context, userID string, textID string, req request.UpdateProgressRequest) (*models.ReadingProgress, error) {
	if userID == "" {
		return nil, apperror.NewBadRequest("user id is required")
	}
	if textID == "" {
		return nil, apperror.NewBadRequest("text id is required")
	}
	if validateErr := validate.Struct(req); validateErr != nil {
		return nil, apperror.NewBadRequest(validateErr.Error())
	}

	// Fetch existing session notes (treat not-found as empty)
	var sessionNoteList []models.SessionNote
	existingProgress, getErr := s.progressStore.Get(ctx, userID, textID)
	if getErr != nil {
		var appErr *apperror.AppError
		if errors.As(getErr, &appErr) && appErr.Status == 404 {
			sessionNoteList = []models.SessionNote{}
		} else {
			slog.Error("failed to get existing progress", "userID", userID, "textID", textID, "error", getErr)
			return nil, getErr
		}
	} else {
		sessionNoteList = existingProgress.SessionNotes
	}

	// Append new session note if note is non-empty
	if req.Note != "" {
		sessionNote := models.SessionNote{
			Date:    time.Now().UTC().Format(time.RFC3339),
			Chapter: req.Chapter,
			Note:    req.Note,
		}
		sessionNoteList = append(sessionNoteList, sessionNote)
	}

	sessionNotesJSON, marshalErr := json.Marshal(sessionNoteList)
	if marshalErr != nil {
		slog.Error("failed to serialize session notes", "userID", userID, "textID", textID, "error", marshalErr)
		return nil, fmt.Errorf("failed to serialize session notes: %w", marshalErr)
	}

	lastReadAt := time.Now().UTC().Format(time.RFC3339)
	progress, upsertErr := s.progressStore.Upsert(ctx, userID, textID, req.Chapter, req.TotalChapters, lastReadAt, string(sessionNotesJSON))
	if upsertErr != nil {
		slog.Error("failed to update reading progress", "userID", userID, "textID", textID, "error", upsertErr)
		return nil, upsertErr
	}

	slog.Info("reading progress updated", "userID", userID, "textID", textID, "chapter", req.Chapter)
	return progress, nil
}
