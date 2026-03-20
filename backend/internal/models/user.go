package models

import "fmt"

type User struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	CreatedAt    string `json:"createdAt"`
}

func (u User) String() string {
	return fmt.Sprintf("User{id:%s, email:%s}", u.ID, u.Email)
}

type UserAnnotation struct {
	UserID string `json:"userId"`
	NodeID string `json:"nodeId"`
	Stance string `json:"stance"`
	Notes  string `json:"notes"`
}

func (a UserAnnotation) String() string {
	return fmt.Sprintf("UserAnnotation{user:%s, node:%s, stance:%s}", a.UserID, a.NodeID, a.Stance)
}
