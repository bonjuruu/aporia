package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupCSRFRouter() *gin.Engine {
	r := gin.New()
	r.Use(CSRF())
	r.GET("/test", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
	r.HEAD("/test", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
	r.POST("/test", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
	r.PUT("/test", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
	r.DELETE("/test", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
	return r
}

func TestCSRF_ShouldPassthroughGETRequests(t *testing.T) {
	t.Parallel()
	router := setupCSRFRouter()

	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusOK, recorder.Code)
}

func TestCSRF_ShouldPassthroughHEADRequests(t *testing.T) {
	t.Parallel()
	router := setupCSRFRouter()

	request := httptest.NewRequest(http.MethodHead, "/test", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusOK, recorder.Code)
}

func TestCSRF_ShouldRejectPOSTWhenCSRFCookieMissing(t *testing.T) {
	t.Parallel()
	router := setupCSRFRouter()

	request := httptest.NewRequest(http.MethodPost, "/test", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusForbidden, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "missing CSRF token")
}

func TestCSRF_ShouldRejectPOSTWhenCSRFHeaderMissing(t *testing.T) {
	t.Parallel()
	router := setupCSRFRouter()

	request := httptest.NewRequest(http.MethodPost, "/test", nil)
	request.AddCookie(&http.Cookie{Name: CSRFCookieName, Value: "valid-token"})
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusForbidden, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "CSRF token mismatch")
}

func TestCSRF_ShouldRejectPOSTWhenCSRFHeaderMismatchesCookie(t *testing.T) {
	t.Parallel()
	router := setupCSRFRouter()

	request := httptest.NewRequest(http.MethodPost, "/test", nil)
	request.AddCookie(&http.Cookie{Name: CSRFCookieName, Value: "correct-token"})
	request.Header.Set(CSRFHeaderName, "wrong-token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusForbidden, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "CSRF token mismatch")
}

func TestCSRF_ShouldAllowPOSTWhenCSRFHeaderMatchesCookie(t *testing.T) {
	t.Parallel()
	router := setupCSRFRouter()

	request := httptest.NewRequest(http.MethodPost, "/test", nil)
	request.AddCookie(&http.Cookie{Name: CSRFCookieName, Value: "valid-token"})
	request.Header.Set(CSRFHeaderName, "valid-token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusOK, recorder.Code)
}

func TestCSRF_ShouldEnforceOnPUTAndDELETE(t *testing.T) {
	t.Parallel()
	router := setupCSRFRouter()

	for _, method := range []string{http.MethodPut, http.MethodDelete} {
		t.Run(method+" without CSRF should be rejected", func(t *testing.T) {
			request := httptest.NewRequest(method, "/test", nil)
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, request)

			assert.Equal(t, http.StatusForbidden, recorder.Code)
		})

		t.Run(method+" with valid CSRF should pass", func(t *testing.T) {
			request := httptest.NewRequest(method, "/test", nil)
			request.AddCookie(&http.Cookie{Name: CSRFCookieName, Value: "token-123"})
			request.Header.Set(CSRFHeaderName, "token-123")
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, request)

			assert.Equal(t, http.StatusOK, recorder.Code)
		})
	}
}
