package service

import (
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()

	if registerNodeTypeErr := validate.RegisterValidation("node_type", func(fl validator.FieldLevel) bool {
		return models.ValidNodeType(models.NodeType(fl.Field().String()))
	}); registerNodeTypeErr != nil {
		panic("failed to register node_type validation: " + registerNodeTypeErr.Error())
	}

	if registerEdgeTypeErr := validate.RegisterValidation("edge_type", func(fl validator.FieldLevel) bool {
		return models.ValidEdgeType(models.EdgeType(fl.Field().String()))
	}); registerEdgeTypeErr != nil {
		panic("failed to register edge_type validation: " + registerEdgeTypeErr.Error())
	}
}
