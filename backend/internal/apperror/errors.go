package apperror

import "net/http"

type AppError struct {
	Status  int
	Message string
}

func (e *AppError) Error() string {
	return e.Message
}

func NewBadRequest(msg string) *AppError {
	return &AppError{Status: http.StatusBadRequest, Message: msg}
}

func NewUnauthorized(msg string) *AppError {
	return &AppError{Status: http.StatusUnauthorized, Message: msg}
}

func NewNotFound(msg string) *AppError {
	return &AppError{Status: http.StatusNotFound, Message: msg}
}

func NewConflict(msg string) *AppError {
	return &AppError{Status: http.StatusConflict, Message: msg}
}

func NewForbidden(msg string) *AppError {
	return &AppError{Status: http.StatusForbidden, Message: msg}
}
