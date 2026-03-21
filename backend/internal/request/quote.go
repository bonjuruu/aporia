package request

type CreateQuoteRequest struct {
	Content      string `json:"content"      validate:"required"`
	SourceTextID string `json:"sourceTextId" validate:"required"`
	Page         *int   `json:"page"         validate:"omitempty,min=1"`
	Reaction     string `json:"reaction"`
}

type UpdateQuoteRequest struct {
	Reaction *string `json:"reaction"`
	Page     *int    `json:"page"    validate:"omitempty,min=1"`
}
