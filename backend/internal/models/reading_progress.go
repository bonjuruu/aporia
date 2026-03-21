package models

import "fmt"

type SessionNote struct {
	Date    string `json:"date"`
	Chapter string `json:"chapter"`
	Note    string `json:"note"`
}

type ReadingProgress struct {
	TextID        string        `json:"textId"`
	TextTitle     string        `json:"textTitle"`
	Chapter       string        `json:"chapter"`
	TotalChapters *int          `json:"totalChapters"`
	LastReadAt    string        `json:"lastReadAt"`
	SessionNotes  []SessionNote `json:"sessionNotes"`
}

func (s SessionNote) String() string {
	return fmt.Sprintf("SessionNote{date:%s, chapter:%s}", s.Date, s.Chapter)
}

func (r ReadingProgress) String() string {
	totalChapters := "nil"
	if r.TotalChapters != nil {
		totalChapters = fmt.Sprintf("%d", *r.TotalChapters)
	}
	return fmt.Sprintf("ReadingProgress{textId:%s, chapter:%s, totalChapters:%s, sessions:%d}", r.TextID, r.Chapter, totalChapters, len(r.SessionNotes))
}
