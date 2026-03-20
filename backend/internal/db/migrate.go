package db

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// RunMigrations reads .up.cypher files from migrationsPath, checks the current
// schema version stored in a :SchemaMigration node, and runs any pending migrations.
func RunMigrations(driver neo4j.DriverWithContext, migrationsPath string) error {
	ctx := context.Background()

	migrationFileList, globErr := filepath.Glob(filepath.Join(migrationsPath, "*.up.cypher"))
	if globErr != nil {
		return fmt.Errorf("failed to glob migration files: %w", globErr)
	}
	sort.Strings(migrationFileList)

	currentVersion, getCurrentVersionErr := getCurrentVersion(ctx, driver)
	if getCurrentVersionErr != nil {
		return fmt.Errorf("failed to get current migration version: %w", getCurrentVersionErr)
	}

	for _, filePath := range migrationFileList {
		version, parseErr := parseVersion(filepath.Base(filePath))
		if parseErr != nil {
			return fmt.Errorf("failed to parse migration version from %s: %w", filePath, parseErr)
		}

		if version <= *currentVersion {
			continue
		}

		slog.Info("running migration", "version", version, "file", filepath.Base(filePath))

		if runErr := runMigrationFile(ctx, driver, filePath); runErr != nil {
			return fmt.Errorf("migration %d failed: %w", version, runErr)
		}

		if setErr := setCurrentVersion(ctx, driver, version); setErr != nil {
			return fmt.Errorf("failed to set migration version %d: %w", version, setErr)
		}
	}

	return nil
}

func getCurrentVersion(ctx context.Context, driver neo4j.DriverWithContext) (*int, error) {
	session := driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, runErr := session.Run(ctx, `
		MERGE (m:SchemaMigration {key: "version"})
		ON CREATE SET m.version = 0
		RETURN m.version as version
	`, nil)
	if runErr != nil {
		return nil, runErr
	}

	if !result.Next(ctx) {
		version := 0
		return &version, nil
	}

	versionVal, _ := result.Record().Get("version")
	if v, ok := versionVal.(int64); ok {
		version := int(v)
		return &version, nil
	}

	version := 0
	return &version, nil
}

func setCurrentVersion(ctx context.Context, driver neo4j.DriverWithContext, version int) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	result, runErr := session.Run(ctx, `
		MATCH (m:SchemaMigration {key: "version"})
		SET m.version = $version
	`, map[string]any{"version": version})
	if runErr != nil {
		return runErr
	}

	_, consumeErr := result.Consume(ctx)
	return consumeErr
}

func runMigrationFile(ctx context.Context, driver neo4j.DriverWithContext, filePath string) error {
	content, readErr := os.ReadFile(filePath)
	if readErr != nil {
		return fmt.Errorf("failed to read file: %w", readErr)
	}

	session := driver.NewSession(ctx, neo4j.SessionConfig{})
	defer session.Close(ctx)

	for _, statement := range strings.Split(string(content), ";") {
		statement = strings.TrimSpace(statement)
		if statement == "" {
			continue
		}

		result, runErr := session.Run(ctx, statement, nil)
		if runErr != nil {
			return fmt.Errorf("statement failed: %w\nstatement: %s", runErr, statement)
		}
		if _, consumeErr := result.Consume(ctx); consumeErr != nil {
			return fmt.Errorf("consume failed: %w\nstatement: %s", consumeErr, statement)
		}
	}

	return nil
}

// parseVersion extracts the version number from a filename like "000001_schema.up.cypher".
func parseVersion(filename string) (int, error) {
	parts := strings.SplitN(filename, "_", 2)
	if len(parts) < 2 {
		return 0, fmt.Errorf("invalid migration filename: %s", filename)
	}
	return strconv.Atoi(parts[0])
}
