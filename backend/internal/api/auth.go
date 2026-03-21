package api

import (
	"errors"
	"net/http"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/middleware"
	"github.com/bonjuruu/aporia/internal/request"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService       *service.AuthService
	annotationService *service.AnnotationService
	cookieConfig      middleware.CookieConfig
}

func NewAuthHandler(authService *service.AuthService, annotationService *service.AnnotationService, cookieConfig middleware.CookieConfig) *AuthHandler {
	return &AuthHandler{
		authService:       authService,
		annotationService: annotationService,
		cookieConfig:      cookieConfig,
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

	middleware.SetAuthCookie(c, token, h.cookieConfig)
	response.RespondStatus(c, http.StatusCreated, "registered")
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

	middleware.SetAuthCookie(c, token, h.cookieConfig)
	response.RespondStatus(c, http.StatusOK, "authenticated")
}

func (h *AuthHandler) Logout(c *gin.Context) {
	middleware.ClearAuthCookie(c, h.cookieConfig)
	response.RespondStatus(c, http.StatusOK, "logged out")
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.RespondError(c, http.StatusUnauthorized, "not authenticated")
		return
	}

	user, getUserErr := h.authService.GetUser(c.Request.Context(), userID.(string))
	if getUserErr != nil {
		var appErr *apperror.AppError
		if errors.As(getUserErr, &appErr) && appErr.Status == http.StatusNotFound {
			middleware.ClearAuthCookie(c, h.cookieConfig)
			response.RespondError(c, http.StatusUnauthorized, "user not found")
			return
		}
		response.HandleError(c, "failed to get user", getUserErr)
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
