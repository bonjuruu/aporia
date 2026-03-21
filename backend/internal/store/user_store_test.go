package store

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/bonjuruu/aporia/internal/apperror"
	neo4jKitMock "github.com/bonjuruu/aporia/internal/kit/neo4j_kit/mock"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestUserStore_Create(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to run create query", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		userStore := NewUserStore(neo4jKit)

		neo4jKit.On("Run", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "CREATE (u:User")
		}), map[string]any{
			"id":            "user-id",
			"email":         "plato@academy.gr",
			"password_hash": "hashed-password",
			"created_at":    "2026-03-18T00:00:00Z",
		}).Return(errors.New("constraint violation")).Once()

		user, createErr := userStore.Create(ctx, "user-id", "plato@academy.gr", "hashed-password", "2026-03-18T00:00:00Z")

		assert.Nil(t, user)
		assert.ErrorContains(t, createErr, "failed to create user")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return user when created successfully", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		userStore := NewUserStore(neo4jKit)

		neo4jKit.On("Run", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "CREATE (u:User")
		}), map[string]any{
			"id":            "user-id",
			"email":         "plato@academy.gr",
			"password_hash": "hashed-password",
			"created_at":    "2026-03-18T00:00:00Z",
		}).Return(nil).Once()

		user, createErr := userStore.Create(ctx, "user-id", "plato@academy.gr", "hashed-password", "2026-03-18T00:00:00Z")

		assert.NoError(t, createErr)
		assert.Equal(t, "user-id", user.ID)
		assert.Equal(t, "plato@academy.gr", user.Email)
		assert.Equal(t, "2026-03-18T00:00:00Z", user.CreatedAt)
		neo4jKit.AssertExpectations(t)
	})
}

func TestUserStore_GetByEmail(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get user by email", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		userStore := NewUserStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "User {email: $email}")
		}), map[string]any{"email": "plato@academy.gr"}).Return(nil, errors.New("connection refused")).Once()

		user, getByEmailErr := userStore.GetByEmail(ctx, "plato@academy.gr")

		assert.Nil(t, user)
		assert.ErrorContains(t, getByEmailErr, "failed to get user by email")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return nil when user is not found by email", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		userStore := NewUserStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "User {email: $email}")
		}), map[string]any{"email": "nobody@academy.gr"}).Return(nil, nil).Once()

		user, getByEmailErr := userStore.GetByEmail(ctx, "nobody@academy.gr")

		assert.Nil(t, user)
		assert.NoError(t, getByEmailErr)
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return user when found by email", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		userStore := NewUserStore(neo4jKit)

		record := &neo4j.Record{
			Keys:   []string{"id", "email", "password_hash", "created_at"},
			Values: []any{"user-id", "plato@academy.gr", "hashed-password", "2026-03-18T00:00:00Z"},
		}
		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "User {email: $email}")
		}), map[string]any{"email": "plato@academy.gr"}).Return(record, nil).Once()

		user, getByEmailErr := userStore.GetByEmail(ctx, "plato@academy.gr")

		assert.NoError(t, getByEmailErr)
		assert.Equal(t, "user-id", user.ID)
		assert.Equal(t, "plato@academy.gr", user.Email)
		assert.Equal(t, "hashed-password", user.PasswordHash)
		assert.Equal(t, "2026-03-18T00:00:00Z", user.CreatedAt)
		neo4jKit.AssertExpectations(t)
	})
}

func TestUserStore_GetByID(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	t.Run("Should return error when neo4j kit fails to get user by id", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		userStore := NewUserStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "User {id: $id}")
		}), map[string]any{"id": "user-id"}).Return(nil, errors.New("connection refused")).Once()

		user, getByIDErr := userStore.GetByID(ctx, "user-id")

		assert.Nil(t, user)
		assert.ErrorContains(t, getByIDErr, "failed to get user by id")
		neo4jKit.AssertExpectations(t)
	})

	t.Run("Should return not found error when user is not found by id", func(t *testing.T) {
		neo4jKit := neo4jKitMock.NewNeo4jKit(t)
		userStore := NewUserStore(neo4jKit)

		neo4jKit.On("Single", ctx, mock.MatchedBy(func(q string) bool {
			return strings.Contains(q, "User {id: $id}")
		}), map[string]any{"id": "nonexistent-id"}).Return(nil, nil).Once()

		user, getByIDErr := userStore.GetByID(ctx, "nonexistent-id")

		assert.Nil(t, user)
		appErr, ok := errors.AsType[*apperror.AppError](getByIDErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, appErr.Status)
		neo4jKit.AssertExpectations(t)
	})
}
