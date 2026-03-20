package service

import (
	"context"
	"log/slog"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/store"
	"github.com/bonjuruu/aporia/internal/util"
	"github.com/google/uuid"
)

type NodeService struct {
	nodeStore store.NodeStore
}

func NewNodeService(nodeStore store.NodeStore) *NodeService {
	return &NodeService{nodeStore: nodeStore}
}

func (s *NodeService) ListNodes(ctx context.Context) ([]response.GraphNode, error) {
	return s.nodeStore.GetAll(ctx)
}

func (s *NodeService) GetNode(ctx context.Context, id string) (*response.NodeDetail, error) {
	if id == "" {
		return nil, apperror.NewBadRequest("id is required")
	}
	return s.nodeStore.GetByID(ctx, id)
}

func (s *NodeService) CreateNode(ctx context.Context, req request.CreateNodeRequest) (*response.GraphNode, error) {
	if validateErr := validate.Struct(req); validateErr != nil {
		return nil, apperror.NewBadRequest(validateErr.Error())
	}

	id := uuid.New().String()
	var node *response.GraphNode
	var createErr error

	switch req.Type {
	case models.NodeTypeThinker:
		thinker := models.Thinker{
			ID:          id,
			Name:        req.Name,
			Description: req.Description,
			Notes:       req.Notes,
			BornYear:    req.BornYear,
			DiedYear:    req.DiedYear,
		}
		node, createErr = s.nodeStore.CreateThinker(ctx, thinker)

	case models.NodeTypeConcept:
		concept := models.Concept{
			ID:          id,
			Name:        req.Name,
			Description: req.Description,
			Notes:       req.Notes,
			Year:        req.Year,
		}
		node, createErr = s.nodeStore.CreateConcept(ctx, concept)

	case models.NodeTypeClaim:
		claim := models.Claim{
			ID:      id,
			Content: req.Content,
			Notes:   req.Notes,
			Year:    req.Year,
		}
		node, createErr = s.nodeStore.CreateClaim(ctx, claim)

	case models.NodeTypeText:
		text := models.Text{
			ID:            id,
			Title:         req.Title,
			Description:   req.Description,
			Notes:         req.Notes,
			PublishedYear: req.PublishedYear,
		}
		node, createErr = s.nodeStore.CreateText(ctx, text)

	default:
		return nil, apperror.NewBadRequest("unsupported node type")
	}

	if createErr != nil {
		slog.Error("failed to create node", "id", id, "type", req.Type, "error", createErr)
		return nil, createErr
	}

	slog.Info("node created", "id", id, "type", req.Type)
	return node, nil
}

func (s *NodeService) UpdateNode(ctx context.Context, id string, req request.UpdateNodeRequest) error {
	if id == "" {
		return apperror.NewBadRequest("id is required")
	}
	if validateErr := validate.Struct(req); validateErr != nil {
		return apperror.NewBadRequest(validateErr.Error())
	}
	if !req.HasUpdates() {
		return apperror.NewBadRequest("at least one field to update is required")
	}

	var updateErr error

	switch req.Type {
	case models.NodeTypeThinker:
		update := models.ThinkerUpdate{
			Name:        req.Name,
			Description: req.Description,
			Notes:       req.Notes,
			BornYear:    req.BornYear,
			DiedYear:    req.DiedYear,
		}
		updateErr = s.nodeStore.UpdateThinker(ctx, id, update)

	case models.NodeTypeConcept:
		update := models.ConceptUpdate{
			Name:        req.Name,
			Description: req.Description,
			Notes:       req.Notes,
			Year:        req.Year,
		}
		updateErr = s.nodeStore.UpdateConcept(ctx, id, update)

	case models.NodeTypeClaim:
		update := models.ClaimUpdate{
			Content: req.Content,
			Notes:   req.Notes,
			Year:    req.Year,
		}
		updateErr = s.nodeStore.UpdateClaim(ctx, id, update)

	case models.NodeTypeText:
		update := models.TextUpdate{
			Title:         req.Title,
			Description:   req.Description,
			Notes:         req.Notes,
			PublishedYear: req.PublishedYear,
		}
		updateErr = s.nodeStore.UpdateText(ctx, id, update)

	default:
		return apperror.NewBadRequest("unsupported node type")
	}

	if updateErr != nil {
		slog.Error("failed to update node", "id", id, "type", req.Type, "error", updateErr)
		return updateErr
	}

	slog.Info("node updated", "id", id, "type", req.Type)
	return nil
}

func (s *NodeService) DeleteNode(ctx context.Context, id string) error {
	if id == "" {
		return apperror.NewBadRequest("id is required")
	}

	deleteErr := s.nodeStore.Delete(ctx, id)
	if deleteErr != nil {
		slog.Error("failed to delete node", "id", id, "error", deleteErr)
		return deleteErr
	}

	slog.Info("node deleted", "id", id)
	return nil
}

func (s *NodeService) Search(ctx context.Context, query string) ([]response.GraphNode, error) {
	if query == "" {
		return nil, apperror.NewBadRequest("query is required")
	}
	sanitizedQuery := util.EscapeLucene(query) + "*"
	return s.nodeStore.Search(ctx, sanitizedQuery)
}
