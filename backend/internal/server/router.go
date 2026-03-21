package server

import (
	"github.com/bonjuruu/aporia/internal/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

const swaggerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aporia API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>body { margin: 0; background: #1a1612; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/api/docs/openapi.yaml",
      dom_id: "#swagger-ui",
      deepLinking: true,
    });
  </script>
</body>
</html>`

func NewRouter(h Handlers, jwtSecret []byte, allowOrigin string) *gin.Engine {
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{allowOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization", middleware.CSRFHeaderName},
		AllowCredentials: true,
	}))

	r.StaticFile("/api/docs/openapi.yaml", "./api/openapi.yaml")
	r.GET("/api/docs", func(c *gin.Context) {
		c.Header("Content-Type", "text/html")
		c.String(200, swaggerHTML)
	})

	authRateLimit := middleware.RateLimit(0.5, 5) // 1 request per 2 seconds, burst of 5
	r.POST("/api/auth/register", authRateLimit, h.Auth.Register)
	r.POST("/api/auth/login", authRateLimit, h.Auth.Login)

	protected := r.Group("/api")
	protected.Use(middleware.Auth(jwtSecret))
	protected.Use(middleware.CSRF())
	{
		protected.GET("/auth/me", h.Auth.GetMe)
		protected.POST("/auth/logout", h.Auth.Logout)

		protected.GET("/graph", h.Graph.GetFullGraph)
		protected.GET("/graph/subgraph/:textId", h.Graph.GetSubgraph)
		protected.GET("/graph/path", h.Graph.GetPath)

		protected.GET("/nodes", h.Node.ListNodes)
		protected.GET("/nodes/:id", h.Node.GetNode)
		protected.POST("/nodes", h.Node.CreateNode)
		protected.PUT("/nodes/:id", h.Node.UpdateNode)
		protected.DELETE("/nodes/:id", h.Node.DeleteNode)

		protected.POST("/edges", h.Edge.CreateEdge)
		protected.PUT("/edges/:id", h.Edge.UpdateEdge)
		protected.DELETE("/edges/:id", h.Edge.DeleteEdge)

		protected.GET("/search", h.Node.Search)

		protected.GET("/annotations", h.Auth.GetAnnotations)
		protected.PUT("/annotations/:nodeId", h.Auth.UpsertAnnotation)

		protected.GET("/quotes", h.Quote.ListQuotes)
		protected.POST("/quotes", h.Quote.CaptureQuote)
		protected.PUT("/quotes/:id", h.Quote.UpdateQuote)
		protected.DELETE("/quotes/:id", h.Quote.DeleteQuote)
		protected.POST("/quotes/:id/promote", h.Quote.PromoteQuote)
	}

	return r
}
