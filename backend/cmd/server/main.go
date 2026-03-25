package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/bonjuruu/aporia/internal/config"
	"github.com/bonjuruu/aporia/internal/db"
	"github.com/bonjuruu/aporia/internal/middleware"
	"github.com/bonjuruu/aporia/internal/server"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg, loadEnvErr := config.LoadEnv()
	if loadEnvErr != nil {
		slog.Error("failed to parse config", "error", loadEnvErr)
		os.Exit(1)
	}

	if cfg.CookieSecure && cfg.JWTSecret == "aporia-dev-secret-change-in-production" {
		slog.Error("refusing to start: JWT_SECRET must be changed from the default when COOKIE_SECURE=true (production)")
		os.Exit(1)
	}

	ctx := context.Background()

	driver, newDriverErr := db.NewDriver(cfg.Neo4jURI, cfg.Neo4jUsername, cfg.Neo4jPassword)
	if newDriverErr != nil {
		slog.Error("failed to connect to Neo4j", "error", newDriverErr)
		os.Exit(1)
	}
	defer func() {
		if closeErr := driver.Close(ctx); closeErr != nil {
			slog.Error("failed to close neo4j driver", "error", closeErr)
		}
	}()

	if migrateErr := db.RunMigrations(driver, "migrations"); migrateErr != nil {
		slog.Error("failed to run migrations", "error", migrateErr)
		os.Exit(1)
	}

	jwtSecret := []byte(cfg.JWTSecret)
	cookieConfig := middleware.CookieConfig{Secure: cfg.CookieSecure}
	handlers := server.WireHandlers(driver, jwtSecret, cookieConfig)
	r := server.NewRouter(handlers, jwtSecret, cfg.AllowOrigin)

	slog.Info("starting server", "port", cfg.Port)
	if runErr := r.Run(":" + cfg.Port); runErr != nil {
		slog.Error("failed to start server", "error", runErr)
		os.Exit(1)
	}
}
