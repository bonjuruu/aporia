package request

type UpdateProgressRequest struct {
	Chapter       string `json:"chapter"       validate:"required"`
	TotalChapters *int   `json:"totalChapters" validate:"omitempty,min=1"`
	Note          string `json:"note"`
}
