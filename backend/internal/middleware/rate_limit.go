package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type ipLimiter struct {
	mu      sync.Mutex
	entries map[string]*bucket
	rate    float64
	burst   int
}

type bucket struct {
	tokens   float64
	lastTime time.Time
}

func newIPLimiter(rate float64, burst int) *ipLimiter {
	limiter := &ipLimiter{
		entries: make(map[string]*bucket),
		rate:    rate,
		burst:   burst,
	}

	go limiter.cleanup()

	return limiter
}

func (l *ipLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	b, exists := l.entries[ip]
	now := time.Now()

	if !exists {
		l.entries[ip] = &bucket{tokens: float64(l.burst) - 1, lastTime: now}
		return true
	}

	elapsed := now.Sub(b.lastTime).Seconds()
	b.tokens += elapsed * l.rate
	if b.tokens > float64(l.burst) {
		b.tokens = float64(l.burst)
	}
	b.lastTime = now

	if b.tokens < 1 {
		return false
	}

	b.tokens--
	return true
}

func (l *ipLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		l.mu.Lock()
		cutoff := time.Now().Add(-10 * time.Minute)
		for ip, b := range l.entries {
			if b.lastTime.Before(cutoff) {
				delete(l.entries, ip)
			}
		}
		l.mu.Unlock()
	}
}

// RateLimit returns a middleware that limits requests per IP.
// rate is tokens added per second, burst is the max tokens (and initial capacity).
// In test mode, returns a passthrough middleware.
func RateLimit(rate float64, burst int) gin.HandlerFunc {
	if gin.Mode() == gin.TestMode {
		return func(c *gin.Context) { c.Next() }
	}

	limiter := newIPLimiter(rate, burst)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.allow(ip) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
			return
		}
		c.Next()
	}
}
