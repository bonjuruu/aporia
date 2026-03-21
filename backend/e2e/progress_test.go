package e2e

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProgressJourney(t *testing.T) {
	cleanDB(t)
	auth := registerAndLogin(t, "reader@agora.gr", "password123")

	// Create a text node
	var textNode response.GraphNode
	doRequest(t, http.MethodPost, "/api/nodes", map[string]any{
		"type": "TEXT", "title": "Republic", "publishedYear": -380,
	}, auth, http.StatusCreated, &textNode)
	require.NotEmpty(t, textNode.ID)

	// List progress should be empty initially
	var emptyProgressList []models.ReadingProgress
	doRequest(t, http.MethodGet, "/api/progress", nil, auth, http.StatusOK, &emptyProgressList)
	assert.Empty(t, emptyProgressList)

	// Get progress for a text should return 404
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/progress/%s", textNode.ID), nil, auth, http.StatusNotFound, nil)

	// Update progress — creates READING relationship
	totalChapters := 10
	var progress models.ReadingProgress
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/progress/%s", textNode.ID), map[string]any{
		"chapter":       "1",
		"totalChapters": totalChapters,
	}, auth, http.StatusOK, &progress)
	assert.Equal(t, textNode.ID, progress.TextID)
	assert.Equal(t, "Republic", progress.TextTitle)
	assert.Equal(t, "1", progress.Chapter)
	assert.Equal(t, 10, *progress.TotalChapters)
	assert.NotEmpty(t, progress.LastReadAt)
	assert.Empty(t, progress.SessionNotes)

	// Get progress should now return the entry
	var getProgress models.ReadingProgress
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/progress/%s", textNode.ID), nil, auth, http.StatusOK, &getProgress)
	assert.Equal(t, "1", getProgress.Chapter)
	assert.Equal(t, 10, *getProgress.TotalChapters)

	// Update progress with a session note
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/progress/%s", textNode.ID), map[string]any{
		"chapter":       "3",
		"totalChapters": totalChapters,
		"note":          "Allegory of the cave section",
	}, auth, http.StatusOK, &progress)
	assert.Equal(t, "3", progress.Chapter)
	assert.Len(t, progress.SessionNotes, 1)
	assert.Equal(t, "Allegory of the cave section", progress.SessionNotes[0].Note)
	assert.Equal(t, "3", progress.SessionNotes[0].Chapter)
	assert.NotEmpty(t, progress.SessionNotes[0].Date)

	// Update again with another note — should append
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/progress/%s", textNode.ID), map[string]any{
		"chapter":       "5",
		"totalChapters": totalChapters,
		"note":          "Theory of forms",
	}, auth, http.StatusOK, &progress)
	assert.Equal(t, "5", progress.Chapter)
	assert.Len(t, progress.SessionNotes, 2)
	assert.Equal(t, "Allegory of the cave section", progress.SessionNotes[0].Note)
	assert.Equal(t, "Theory of forms", progress.SessionNotes[1].Note)

	// Update without a note — should preserve existing notes
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/progress/%s", textNode.ID), map[string]any{
		"chapter":       "6",
		"totalChapters": totalChapters,
	}, auth, http.StatusOK, &progress)
	assert.Equal(t, "6", progress.Chapter)
	assert.Len(t, progress.SessionNotes, 2)

	// List progress — should have 1 entry
	var progressList []models.ReadingProgress
	doRequest(t, http.MethodGet, "/api/progress", nil, auth, http.StatusOK, &progressList)
	assert.Len(t, progressList, 1)
	assert.Equal(t, "6", progressList[0].Chapter)

	// Test user isolation — second user should see empty progress
	auth2 := registerAndLogin(t, "reader2@agora.gr", "password123")

	var emptyProgressList2 []models.ReadingProgress
	doRequest(t, http.MethodGet, "/api/progress", nil, auth2, http.StatusOK, &emptyProgressList2)
	assert.Empty(t, emptyProgressList2)

	// Second user should get 404 for first user's text progress
	doRequest(t, http.MethodGet, fmt.Sprintf("/api/progress/%s", textNode.ID), nil, auth2, http.StatusNotFound, nil)

	// Test validation — missing chapter should fail
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/progress/%s", textNode.ID), map[string]any{}, auth, http.StatusBadRequest, nil)

	// Test validation — zero totalChapters should fail
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/progress/%s", textNode.ID), map[string]any{
		"chapter": "1", "totalChapters": 0,
	}, auth, http.StatusBadRequest, nil)

	// Test validation — negative totalChapters should fail
	doRequest(t, http.MethodPut, fmt.Sprintf("/api/progress/%s", textNode.ID), map[string]any{
		"chapter": "1", "totalChapters": -5,
	}, auth, http.StatusBadRequest, nil)

	// Test updating progress on a non-existent text should fail
	doRequest(t, http.MethodPut, "/api/progress/00000000-0000-0000-0000-000000000000", map[string]any{
		"chapter": "1",
	}, auth, http.StatusBadRequest, nil)
}
