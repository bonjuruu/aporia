package store

import (
	"context"
	"fmt"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/util"
)

type UserStore interface {
	Create(ctx context.Context, id, email, passwordHash, createdAt string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
}

type userStore struct {
	neo4jKit neo4j_kit.Neo4jKit
}

func NewUserStore(neo4jKit neo4j_kit.Neo4jKit) UserStore {
	return &userStore{neo4jKit: neo4jKit}
}

func (s *userStore) Create(ctx context.Context, id, email, passwordHash, createdAt string) (*models.User, error) {
	runErr := s.neo4jKit.Run(ctx, `
		CREATE (u:User {
			id: $id,
			email: $email,
			password_hash: $password_hash,
			created_at: $created_at
		})
	`, map[string]any{
		"id":            id,
		"email":         email,
		"password_hash": passwordHash,
		"created_at":    createdAt,
	})
	if runErr != nil {
		return nil, fmt.Errorf("failed to create user: %w", runErr)
	}

	user := &models.User{
		ID:        id,
		Email:     email,
		CreatedAt: createdAt,
	}

	return user, nil
}

func (s *userStore) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {email: $email})
		RETURN u.id as id, u.email as email, u.password_hash as password_hash, u.created_at as created_at
	`, map[string]any{"email": email})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", singleErr)
	}

	if record == nil {
		return nil, nil
	}

	user := &models.User{
		ID:           util.RecordString(record, "id"),
		Email:        util.RecordString(record, "email"),
		PasswordHash: util.RecordString(record, "password_hash"),
		CreatedAt:    util.RecordString(record, "created_at"),
	}

	return user, nil
}

func (s *userStore) GetByID(ctx context.Context, id string) (*models.User, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (u:User {id: $id})
		RETURN u.id as id, u.email as email, u.password_hash as password_hash, u.created_at as created_at
	`, map[string]any{"id": id})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to get user by id: %w", singleErr)
	}

	if record == nil {
		return nil, apperror.NewNotFound("user not found")
	}

	user := &models.User{
		ID:           util.RecordString(record, "id"),
		Email:        util.RecordString(record, "email"),
		PasswordHash: util.RecordString(record, "password_hash"),
		CreatedAt:    util.RecordString(record, "created_at"),
	}

	return user, nil
}
