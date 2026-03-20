package apperror

import (
	"fmt"
	"net/http"
)

type AppError struct {
	Status  int
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Err.Error()
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func NewBadRequest(msg string) *AppError {
	return &AppError{Status: http.StatusBadRequest, Message: msg, Err: fmt.Errorf("%s", msg)}
}

func NewUnauthorized(msg string) *AppError {
	return &AppError{Status: http.StatusUnauthorized, Message: msg, Err: fmt.Errorf("%s", msg)}
}

func NewNotFound(msg string) *AppError {
	return &AppError{Status: http.StatusNotFound, Message: msg, Err: fmt.Errorf("%s", msg)}
}

func NewConflict(msg string) *AppError {
	return &AppError{Status: http.StatusConflict, Message: msg, Err: fmt.Errorf("%s", msg)}
}

func NewForbidden(msg string) *AppError {
	return &AppError{Status: http.StatusForbidden, Message: msg, Err: fmt.Errorf("%s", msg)}
}
