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

type QuoteService struct {
	quoteStore store.QuoteStore
}

func NewQuoteService(quoteStore store.QuoteStore) *QuoteService {
	return &QuoteService{quoteStore: quoteStore}
}

func (s *QuoteService) Capture(ctx context.Context, userID string, req request.CreateQuoteRequest) (*models.Quote, error) {
	if userID == "" {
		return nil, apperror.NewBadRequest("user id is required")
	}
	if validateErr := validate.Struct(req); validateErr != nil {
		return nil, apperror.NewBadRequest(validateErr.Error())
	}

	quote := models.Quote{
		ID:           uuid.New().String(),
		Content:      req.Content,
		SourceTextID: req.SourceTextID,
		Page:         req.Page,
		Reaction:     req.Reaction,
		Status:       models.QuoteStatusRaw,
	}

	createdQuote, createErr := s.quoteStore.Create(ctx, userID, quote)
	if createErr != nil {
		slog.Error("failed to capture quote", "userID", userID, "error", createErr)
		return nil, createErr
	}

	slog.Info("quote captured", "quoteID", createdQuote.ID, "userID", userID, "textID", req.SourceTextID)
	return createdQuote, nil
}

func (s *QuoteService) List(ctx context.Context, userID string, textID string) ([]*models.Quote, error) {
	if userID == "" {
		return nil, apperror.NewBadRequest("user id is required")
	}
	return s.quoteStore.ListByUser(ctx, userID, textID)
}

func (s *QuoteService) Update(ctx context.Context, userID string, id string, req request.UpdateQuoteRequest) error {
	if userID == "" {
		return apperror.NewBadRequest("user id is required")
	}
	if id == "" {
		return apperror.NewBadRequest("quote id is required")
	}
	if req.Reaction == nil && req.Page == nil {
		return apperror.NewBadRequest("no fields to update")
	}
	if validateErr := validate.Struct(req); validateErr != nil {
		return apperror.NewBadRequest(validateErr.Error())
	}

	updateErr := s.quoteStore.Update(ctx, userID, id, req.Reaction, req.Page)
	if updateErr != nil {
		slog.Error("failed to update quote", "quoteID", id, "error", updateErr)
		return updateErr
	}

	slog.Info("quote updated", "quoteID", id)
	return nil
}

func (s *QuoteService) Delete(ctx context.Context, userID string, id string) error {
	if userID == "" {
		return apperror.NewBadRequest("user id is required")
	}
	if id == "" {
		return apperror.NewBadRequest("quote id is required")
	}

	deleteErr := s.quoteStore.Delete(ctx, userID, id)
	if deleteErr != nil {
		slog.Error("failed to delete quote", "quoteID", id, "error", deleteErr)
		return deleteErr
	}

	slog.Info("quote deleted", "quoteID", id)
	return nil
}

func (s *QuoteService) Promote(ctx context.Context, quoteID string, userID string, nodeReq request.CreateNodeRequest) (*response.GraphNode, error) {
	if quoteID == "" {
		return nil, apperror.NewBadRequest("quote id is required")
	}
	if userID == "" {
		return nil, apperror.NewBadRequest("user id is required")
	}
	if validateErr := validate.Struct(nodeReq); validateErr != nil {
		return nil, apperror.NewBadRequest(validateErr.Error())
	}

	label, props := buildNodeProps(nodeReq)
	if label == "" {
		return nil, apperror.NewBadRequest("invalid node type")
	}

	id := uuid.New().String()
	props["id"] = id

	node, promoteErr := s.quoteStore.Promote(ctx, userID, quoteID, label, props)
	if promoteErr != nil {
		slog.Error("failed to promote quote", "quoteID", quoteID, "error", promoteErr)
		return nil, promoteErr
	}

	slog.Info("quote promoted to node", "quoteID", quoteID, "nodeID", node.ID, "nodeType", nodeReq.Type)
	return node, nil
}

func buildNodeProps(req request.CreateNodeRequest) (string, map[string]any) {
	switch req.Type {
	case models.NodeTypeThinker:
		return "Thinker", map[string]any{
			"name":        req.Name,
			"description": req.Description,
			"notes":       req.Notes,
			"born_year":   util.DerefOrNil(req.BornYear),
			"died_year":   util.DerefOrNil(req.DiedYear),
		}
	case models.NodeTypeConcept:
		return "Concept", map[string]any{
			"name":        req.Name,
			"description": req.Description,
			"notes":       req.Notes,
			"year":        util.DerefOrNil(req.Year),
		}
	case models.NodeTypeClaim:
		return "Claim", map[string]any{
			"content": req.Content,
			"notes":   req.Notes,
			"year":    util.DerefOrNil(req.Year),
		}
	case models.NodeTypeText:
		return "Text", map[string]any{
			"title":          req.Title,
			"description":    req.Description,
			"notes":          req.Notes,
			"published_year": util.DerefOrNil(req.PublishedYear),
		}
	default:
		return "", nil
	}
}
