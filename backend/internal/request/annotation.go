package request

type AnnotationRequest struct {
	Stance string `json:"stance" validate:"required,oneof=agree disagree uncertain unread"`
	Notes  string `json:"notes"`
}
