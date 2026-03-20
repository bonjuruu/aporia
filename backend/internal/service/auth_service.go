package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/store"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userStore store.UserStore
	jwtSecret []byte
}

func NewAuthService(userStore store.UserStore, jwtSecret []byte) *AuthService {
	return &AuthService{
		userStore: userStore,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) Register(ctx context.Context, req request.RegisterRequest) (*models.User, error) {
	if validateErr := validate.Struct(req); validateErr != nil {
		return nil, apperror.NewBadRequest(validateErr.Error())
	}

	existing, getByEmailErr := s.userStore.GetByEmail(ctx, req.Email)
	if getByEmailErr != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", getByEmailErr)
	}
	if existing != nil {
		return nil, apperror.NewConflict("email already registered")
	}

	hash, hashErr := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if hashErr != nil {
		return nil, fmt.Errorf("failed to hash password: %w", hashErr)
	}

	id := uuid.New().String()
	createdAt := time.Now().UTC().Format(time.RFC3339)

	user, createErr := s.userStore.Create(ctx, id, req.Email, string(hash), createdAt)
	if createErr != nil {
		slog.Error("failed to register user", "email", req.Email, "error", createErr)
		return nil, fmt.Errorf("failed to create user: %w", createErr)
	}

	slog.Info("user registered", "id", id, "email", req.Email)
	return user, nil
}

func (s *AuthService) Login(ctx context.Context, req request.LoginRequest) (string, error) {
	if validateErr := validate.Struct(req); validateErr != nil {
		return "", apperror.NewBadRequest(validateErr.Error())
	}

	user, getByEmailErr := s.userStore.GetByEmail(ctx, req.Email)
	if getByEmailErr != nil {
		return "", fmt.Errorf("failed to look up user: %w", getByEmailErr)
	}
	if user == nil {
		return "", apperror.NewUnauthorized("invalid credentials")
	}

	if compareErr := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); compareErr != nil {
		return "", apperror.NewUnauthorized("invalid credentials")
	}

	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID,
		"iat": now.Unix(),
		"exp": now.Add(7 * 24 * time.Hour).Unix(),
	})

	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) GetUser(ctx context.Context, userID string) (*models.User, error) {
	return s.userStore.GetByID(ctx, userID)
}
