package service

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	storeMock "github.com/bonjuruu/aporia/internal/store/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthService_Register(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	jwtSecret := []byte("test-secret-key-at-least-32-chars!!")

	t.Run("Should return error when email is invalid", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		registerRequest := request.RegisterRequest{
			Email:    "not-an-email",
			Password: "password123",
		}

		result, registerErr := authService.Register(ctx, registerRequest)

		assert.Empty(t, result)
		assert.Error(t, registerErr)
		userStore.AssertNotCalled(t, "GetByEmail")
		userStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when email is missing", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		registerRequest := request.RegisterRequest{
			Email:    "",
			Password: "password123",
		}

		result, registerErr := authService.Register(ctx, registerRequest)

		assert.Empty(t, result)
		assert.Error(t, registerErr)
		appErr, ok := errors.AsType[*apperror.AppError](registerErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, appErr.Status)
		userStore.AssertNotCalled(t, "GetByEmail")
		userStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when password is missing", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		registerRequest := request.RegisterRequest{
			Email:    "plato@academy.gr",
			Password: "",
		}

		result, registerErr := authService.Register(ctx, registerRequest)

		assert.Empty(t, result)
		assert.Error(t, registerErr)
		appErr, ok := errors.AsType[*apperror.AppError](registerErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, appErr.Status)
		userStore.AssertNotCalled(t, "GetByEmail")
		userStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when password is too short", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		registerRequest := request.RegisterRequest{
			Email:    "plato@academy.gr",
			Password: "short",
		}

		result, registerErr := authService.Register(ctx, registerRequest)

		assert.Empty(t, result)
		assert.Error(t, registerErr)
		userStore.AssertNotCalled(t, "GetByEmail")
		userStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when password exceeds bcrypt max length", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		registerRequest := request.RegisterRequest{
			Email:    "plato@academy.gr",
			Password: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		}

		result, registerErr := authService.Register(ctx, registerRequest)

		assert.Empty(t, result)
		assert.Error(t, registerErr)
		appErr, ok := errors.AsType[*apperror.AppError](registerErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, appErr.Status)
		userStore.AssertNotCalled(t, "GetByEmail")
		userStore.AssertNotCalled(t, "Create")
	})

	t.Run("Should return error when email is already registered", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		registerRequest := request.RegisterRequest{
			Email:    "plato@academy.gr",
			Password: "password123",
		}

		existingUser := &models.User{
			ID:    "existing-user-id",
			Email: "plato@academy.gr",
		}
		userStore.On("GetByEmail", ctx, "plato@academy.gr").Return(existingUser, nil).Once()

		result, registerErr := authService.Register(ctx, registerRequest)

		assert.Empty(t, result)
		assert.EqualError(t, registerErr, "email already registered")
		appErr, ok := errors.AsType[*apperror.AppError](registerErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusConflict, appErr.Status)
		userStore.AssertNotCalled(t, "Create")
		userStore.AssertExpectations(t)
	})

	t.Run("Should return error when store fails to create user", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		registerRequest := request.RegisterRequest{
			Email:    "plato@academy.gr",
			Password: "password123",
		}

		userStore.On("GetByEmail", ctx, "plato@academy.gr").Return(nil, nil).Once()
		userStore.On("Create", ctx, mock.AnythingOfType("string"), "plato@academy.gr", mock.AnythingOfType("string"), mock.AnythingOfType("string")).Return(nil, errors.New("constraint violation")).Once()

		result, registerErr := authService.Register(ctx, registerRequest)

		assert.Empty(t, result)
		assert.EqualError(t, registerErr, "failed to create user: constraint violation")
		_, isAppErr := errors.AsType[*apperror.AppError](registerErr)
		assert.False(t, isAppErr)
		userStore.AssertExpectations(t)
	})

	t.Run("Should return error when store fails to check email", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		registerRequest := request.RegisterRequest{
			Email:    "plato@academy.gr",
			Password: "password123",
		}

		userStore.On("GetByEmail", ctx, "plato@academy.gr").Return(nil, errors.New("connection refused")).Once()

		result, registerErr := authService.Register(ctx, registerRequest)

		assert.Empty(t, result)
		assert.EqualError(t, registerErr, "failed to check existing user: connection refused")
		userStore.AssertNotCalled(t, "Create")
		userStore.AssertExpectations(t)
	})
}

func TestAuthService_Login(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	jwtSecret := []byte("test-secret-key-at-least-32-chars!!")

	t.Run("Should return error when email is invalid", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		loginRequest := request.LoginRequest{
			Email:    "not-an-email",
			Password: "password123",
		}

		token, loginErr := authService.Login(ctx, loginRequest)

		assert.Empty(t, token)
		assert.Error(t, loginErr)
		userStore.AssertNotCalled(t, "GetByEmail")
	})

	t.Run("Should return error when password is missing", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		loginRequest := request.LoginRequest{
			Email:    "plato@academy.gr",
			Password: "",
		}

		token, loginErr := authService.Login(ctx, loginRequest)

		assert.Empty(t, token)
		assert.Error(t, loginErr)
		appErr, ok := errors.AsType[*apperror.AppError](loginErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, appErr.Status)
		userStore.AssertNotCalled(t, "GetByEmail")
	})

	t.Run("Should return error when user is not found", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		loginRequest := request.LoginRequest{
			Email:    "plato@academy.gr",
			Password: "password123",
		}

		userStore.On("GetByEmail", ctx, "plato@academy.gr").Return(nil, nil).Once()

		token, loginErr := authService.Login(ctx, loginRequest)

		assert.Empty(t, token)
		assert.EqualError(t, loginErr, "invalid credentials")
		loginAppErr, ok := errors.AsType[*apperror.AppError](loginErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, loginAppErr.Status)
		userStore.AssertExpectations(t)
	})

	t.Run("Should return error when password is wrong", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		loginRequest := request.LoginRequest{
			Email:    "plato@academy.gr",
			Password: "wrong-password",
		}

		hash, _ := bcrypt.GenerateFromPassword([]byte("correct-password"), 12)
		existingUser := &models.User{
			ID:           "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			Email:        "plato@academy.gr",
			PasswordHash: string(hash),
		}
		userStore.On("GetByEmail", ctx, "plato@academy.gr").Return(existingUser, nil).Once()

		token, loginErr := authService.Login(ctx, loginRequest)

		assert.Empty(t, token)
		assert.EqualError(t, loginErr, "invalid credentials")
		wrongPwAppErr, ok := errors.AsType[*apperror.AppError](loginErr)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, wrongPwAppErr.Status)
		userStore.AssertExpectations(t)
	})

	t.Run("Should return error when store fails to get user by email", func(t *testing.T) {
		userStore := storeMock.NewUserStore(t)
		authService := NewAuthService(userStore, jwtSecret)

		loginRequest := request.LoginRequest{
			Email:    "plato@academy.gr",
			Password: "password123",
		}

		userStore.On("GetByEmail", ctx, "plato@academy.gr").Return(nil, errors.New("connection refused")).Once()

		token, loginErr := authService.Login(ctx, loginRequest)

		assert.Empty(t, token)
		assert.EqualError(t, loginErr, "failed to look up user: connection refused")
		userStore.AssertExpectations(t)
	})
}
