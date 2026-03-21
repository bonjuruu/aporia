package server

import (
	"github.com/bonjuruu/aporia/internal/api"
	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/middleware"
	"github.com/bonjuruu/aporia/internal/service"
	"github.com/bonjuruu/aporia/internal/store"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type Handlers struct {
	Node  *api.NodeHandler
	Edge  *api.EdgeHandler
	Graph *api.GraphHandler
	Auth  *api.AuthHandler
}

func WireHandlers(driver neo4j.DriverWithContext, jwtSecret []byte, cookieConfig middleware.CookieConfig) Handlers {
	neo4jKit := neo4j_kit.NewNeo4jKit(driver)

	nodeStore := store.NewNodeStore(neo4jKit)
	edgeStore := store.NewEdgeStore(neo4jKit)
	graphStore := store.NewGraphStore(neo4jKit)
	userStore := store.NewUserStore(neo4jKit)
	annotationStore := store.NewAnnotationStore(neo4jKit)

	nodeService := service.NewNodeService(nodeStore)
	edgeService := service.NewEdgeService(edgeStore)
	graphService := service.NewGraphService(graphStore)
	authService := service.NewAuthService(userStore, jwtSecret)
	annotationService := service.NewAnnotationService(annotationStore)

	return Handlers{
		Node:  api.NewNodeHandler(nodeService),
		Edge:  api.NewEdgeHandler(edgeService),
		Graph: api.NewGraphHandler(graphService),
		Auth:  api.NewAuthHandler(authService, annotationService, cookieConfig),
	}
}
