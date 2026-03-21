package api

import (
	"net/http"

	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService       *service.AuthService
	annotationService *service.AnnotationService
}

func NewAuthHandler(authService *service.AuthService, annotationService *service.AnnotationService) *AuthHandler {
	return &AuthHandler{
		authService:       authService,
		annotationService: annotationService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req request.RegisterRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	token, registerErr := h.authService.Register(c.Request.Context(), req)
	if registerErr != nil {
		response.HandleError(c, "failed to register user", registerErr)
		return
	}

	c.JSON(http.StatusCreated, response.TokenResponse{Token: token})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req request.LoginRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	token, loginErr := h.authService.Login(c.Request.Context(), req)
	if loginErr != nil {
		response.HandleError(c, "failed to login", loginErr)
		return
	}

	c.JSON(http.StatusOK, response.TokenResponse{Token: token})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.RespondError(c, http.StatusUnauthorized, "not authenticated")
		return
	}

	user, getUserErr := h.authService.GetUser(c.Request.Context(), userID.(string))
	if getUserErr != nil {
		response.HandleError(c, "failed to get user", getUserErr)
		return
	}
	if user == nil {
		response.RespondError(c, http.StatusNotFound, "user not found")
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) GetAnnotations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.RespondError(c, http.StatusUnauthorized, "not authenticated")
		return
	}

	annotationList, getByUserIDErr := h.annotationService.GetByUserID(c.Request.Context(), userID.(string))
	if getByUserIDErr != nil {
		response.HandleError(c, "failed to get annotations", getByUserIDErr)
		return
	}

	c.JSON(http.StatusOK, annotationList)
}

func (h *AuthHandler) UpsertAnnotation(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.RespondError(c, http.StatusUnauthorized, "not authenticated")
		return
	}

	nodeID := c.Param("nodeId")

	var req request.AnnotationRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		response.RespondError(c, http.StatusBadRequest, bindErr.Error())
		return
	}

	if upsertErr := h.annotationService.Upsert(c.Request.Context(), userID.(string), nodeID, req); upsertErr != nil {
		response.HandleError(c, "failed to upsert annotation", upsertErr)
		return
	}

	response.RespondStatus(c, http.StatusOK, "updated")
}
