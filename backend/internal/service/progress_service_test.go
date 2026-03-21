package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	storeMock "github.com/bonjuruu/aporia/internal/store/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func isRFC3339(s string) bool {
	_, parseErr := time.Parse(time.RFC3339, s)
	return parseErr == nil
}

func TestProgressService_Get(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when user id is empty", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		result, getErr := progressService.Get(ctx, "", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.Nil(t, result)
		assert.EqualError(t, getErr, "user id is required")
		progressStore.AssertNotCalled(t, "Get")
	})

	t.Run("Should return error when text id is empty", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		result, getErr := progressService.Get(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "")

		assert.Nil(t, result)
		assert.EqualError(t, getErr, "text id is required")
		progressStore.AssertNotCalled(t, "Get")
	})

	t.Run("Should return error when progress store fails to get progress", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		progressStore.On("Get", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901").
			Return(nil, errors.New("connection refused")).Once()

		result, getErr := progressService.Get(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901")

		assert.Nil(t, result)
		assert.EqualError(t, getErr, "connection refused")
		progressStore.AssertExpectations(t)
	})
}

func TestProgressService_List(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when user id is empty", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		result, listErr := progressService.List(ctx, "")

		assert.Nil(t, result)
		assert.EqualError(t, listErr, "user id is required")
		progressStore.AssertNotCalled(t, "List")
	})

	t.Run("Should return error when progress store fails to list progress", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		progressStore.On("List", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012").
			Return(nil, errors.New("connection refused")).Once()

		result, listErr := progressService.List(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012")

		assert.Nil(t, result)
		assert.EqualError(t, listErr, "connection refused")
		progressStore.AssertExpectations(t)
	})
}

func TestProgressService_Update(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when user id is empty", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		updateProgressRequest := request.UpdateProgressRequest{Chapter: "1"}

		result, updateErr := progressService.Update(ctx, "", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.Nil(t, result)
		assert.EqualError(t, updateErr, "user id is required")
		progressStore.AssertNotCalled(t, "Get")
		progressStore.AssertNotCalled(t, "Upsert")
	})

	t.Run("Should return error when text id is empty", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		updateProgressRequest := request.UpdateProgressRequest{Chapter: "1"}

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "", updateProgressRequest)

		assert.Nil(t, result)
		assert.EqualError(t, updateErr, "text id is required")
		progressStore.AssertNotCalled(t, "Get")
		progressStore.AssertNotCalled(t, "Upsert")
	})

	t.Run("Should return error when chapter is missing", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		updateProgressRequest := request.UpdateProgressRequest{}

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.Nil(t, result)
		assert.Error(t, updateErr)
		progressStore.AssertNotCalled(t, "Get")
		progressStore.AssertNotCalled(t, "Upsert")
	})

	t.Run("Should return error when total chapters is zero", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		totalChapters := 0
		updateProgressRequest := request.UpdateProgressRequest{
			Chapter:       "1",
			TotalChapters: &totalChapters,
		}

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.Nil(t, result)
		assert.Error(t, updateErr)
		progressStore.AssertNotCalled(t, "Get")
		progressStore.AssertNotCalled(t, "Upsert")
	})

	t.Run("Should return error when total chapters is negative", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		totalChapters := -10
		updateProgressRequest := request.UpdateProgressRequest{
			Chapter:       "1",
			TotalChapters: &totalChapters,
		}

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.Nil(t, result)
		assert.Error(t, updateErr)
		progressStore.AssertNotCalled(t, "Get")
		progressStore.AssertNotCalled(t, "Upsert")
	})

	t.Run("Should return error when progress store fails to get existing progress", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		updateProgressRequest := request.UpdateProgressRequest{Chapter: "3"}

		progressStore.On("Get", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901").
			Return(nil, errors.New("connection refused")).Once()

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.Nil(t, result)
		assert.ErrorContains(t, updateErr, "connection refused")
		progressStore.AssertNotCalled(t, "Upsert")
	})

	t.Run("Should return error when progress store fails to upsert", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		updateProgressRequest := request.UpdateProgressRequest{Chapter: "3"}

		progressStore.On("Get", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901").
			Return(nil, apperror.NewNotFound("reading progress not found")).Once()
		progressStore.On("Upsert", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			"3", (*int)(nil), mock.MatchedBy(isRFC3339), mock.MatchedBy(func(s string) bool {
				return s == "[]"
			})).
			Run(func(args mock.Arguments) {
				sessionNotesJSON := args.Get(6).(string)
				assert.Equal(t, "[]", sessionNotesJSON)
			}).
			Return(nil, errors.New("connection refused")).Once()

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.Nil(t, result)
		assert.ErrorContains(t, updateErr, "connection refused")
	})

	t.Run("Should append session note when note is non-empty", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		existingProgress := &models.ReadingProgress{
			TextID:       "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			Chapter:      "1",
			SessionNotes: []models.SessionNote{{Date: "2026-03-20T09:00:00Z", Chapter: "1", Note: "Started"}},
		}

		updateProgressRequest := request.UpdateProgressRequest{Chapter: "3", Note: "Interesting section"}

		progressStore.On("Get", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901").
			Return(existingProgress, nil).Once()
		progressStore.On("Upsert", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			"3", (*int)(nil), mock.MatchedBy(isRFC3339), mock.MatchedBy(func(s string) bool {
				var noteList []models.SessionNote
				if unmarshalErr := json.Unmarshal([]byte(s), &noteList); unmarshalErr != nil {
					return false
				}
				return len(noteList) == 2
			})).
			Run(func(args mock.Arguments) {
				sessionNotesJSON := args.Get(6).(string)
				var noteList []models.SessionNote
				assert.NoError(t, json.Unmarshal([]byte(sessionNotesJSON), &noteList))
				assert.Equal(t, "Started", noteList[0].Note)
				assert.Equal(t, "Interesting section", noteList[1].Note)
				assert.Equal(t, "3", noteList[1].Chapter)
			}).
			Return(&models.ReadingProgress{TextID: "b2c3d4e5-f6a7-8901-bcde-f12345678901", Chapter: "3"}, nil).Once()

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.NoError(t, updateErr)
		assert.Equal(t, "3", result.Chapter)
	})

	t.Run("Should preserve existing session notes when note is empty", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		existingProgress := &models.ReadingProgress{
			TextID:       "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			Chapter:      "1",
			SessionNotes: []models.SessionNote{{Date: "2026-03-20T09:00:00Z", Chapter: "1", Note: "Started"}},
		}

		updateProgressRequest := request.UpdateProgressRequest{Chapter: "3"}

		progressStore.On("Get", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901").
			Return(existingProgress, nil).Once()
		progressStore.On("Upsert", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			"3", (*int)(nil), mock.MatchedBy(isRFC3339), mock.MatchedBy(func(s string) bool {
				var noteList []models.SessionNote
				if unmarshalErr := json.Unmarshal([]byte(s), &noteList); unmarshalErr != nil {
					return false
				}
				return len(noteList) == 1
			})).
			Run(func(args mock.Arguments) {
				sessionNotesJSON := args.Get(6).(string)
				var noteList []models.SessionNote
				assert.NoError(t, json.Unmarshal([]byte(sessionNotesJSON), &noteList))
				assert.Equal(t, "Started", noteList[0].Note)
			}).
			Return(&models.ReadingProgress{TextID: "b2c3d4e5-f6a7-8901-bcde-f12345678901", Chapter: "3"}, nil).Once()

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.NoError(t, updateErr)
		assert.Equal(t, "3", result.Chapter)
	})

	t.Run("Should start with empty session notes when progress not found", func(t *testing.T) {
		progressStore := storeMock.NewProgressStore(t)
		progressService := NewProgressService(progressStore)

		updateProgressRequest := request.UpdateProgressRequest{Chapter: "1", Note: "First session"}

		progressStore.On("Get", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901").
			Return(nil, apperror.NewNotFound("reading progress not found")).Once()
		progressStore.On("Upsert", ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901",
			"1", (*int)(nil), mock.MatchedBy(isRFC3339), mock.MatchedBy(func(s string) bool {
				var noteList []models.SessionNote
				if unmarshalErr := json.Unmarshal([]byte(s), &noteList); unmarshalErr != nil {
					return false
				}
				return len(noteList) == 1
			})).
			Run(func(args mock.Arguments) {
				sessionNotesJSON := args.Get(6).(string)
				var noteList []models.SessionNote
				assert.NoError(t, json.Unmarshal([]byte(sessionNotesJSON), &noteList))
				assert.Equal(t, "First session", noteList[0].Note)
				assert.Equal(t, "1", noteList[0].Chapter)
			}).
			Return(&models.ReadingProgress{TextID: "b2c3d4e5-f6a7-8901-bcde-f12345678901", Chapter: "1"}, nil).Once()

		result, updateErr := progressService.Update(ctx, "c3d4e5f6-a7b8-9012-cdef-123456789012", "b2c3d4e5-f6a7-8901-bcde-f12345678901", updateProgressRequest)

		assert.NoError(t, updateErr)
		assert.Equal(t, "1", result.Chapter)
	})
}
