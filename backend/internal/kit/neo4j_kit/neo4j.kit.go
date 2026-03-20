package neo4j_kit

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type Neo4jKit interface {
	Run(ctx context.Context, cypher string, params map[string]any) error
	Collect(ctx context.Context, cypher string, params map[string]any) ([]*neo4j.Record, error)
	Single(ctx context.Context, cypher string, params map[string]any) (*neo4j.Record, error)
}

type neo4jKit struct {
	driver neo4j.DriverWithContext
}

func NewNeo4jKit(driver neo4j.DriverWithContext) Neo4jKit {
	return &neo4jKit{driver: driver}
}

func (k *neo4jKit) Run(ctx context.Context, cypher string, params map[string]any) error {
	session := k.driver.NewSession(ctx, neo4j.SessionConfig{})
	defer func() {
		if closeErr := session.Close(ctx); closeErr != nil {
			slog.Error("failed to close neo4j session", "error", closeErr)
		}
	}()

	result, runErr := session.Run(ctx, cypher, params)
	if runErr != nil {
		return fmt.Errorf("neo4j run failed: %w", runErr)
	}

	_, consumeErr := result.Consume(ctx)
	if consumeErr != nil {
		return fmt.Errorf("neo4j run consume failed: %w", consumeErr)
	}

	return nil
}

func (k *neo4jKit) Collect(ctx context.Context, cypher string, params map[string]any) ([]*neo4j.Record, error) {
	session := k.driver.NewSession(ctx, neo4j.SessionConfig{})
	defer func() {
		if closeErr := session.Close(ctx); closeErr != nil {
			slog.Error("failed to close neo4j session", "error", closeErr)
		}
	}()

	result, runErr := session.Run(ctx, cypher, params)
	if runErr != nil {
		return nil, fmt.Errorf("neo4j collect failed: %w", runErr)
	}

	var recordList []*neo4j.Record
	for result.Next(ctx) {
		recordList = append(recordList, result.Record())
	}

	if resultErr := result.Err(); resultErr != nil {
		return nil, fmt.Errorf("neo4j collect iteration failed: %w", resultErr)
	}

	return recordList, nil
}

func (k *neo4jKit) Single(ctx context.Context, cypher string, params map[string]any) (*neo4j.Record, error) {
	session := k.driver.NewSession(ctx, neo4j.SessionConfig{})
	defer func() {
		if closeErr := session.Close(ctx); closeErr != nil {
			slog.Error("failed to close neo4j session", "error", closeErr)
		}
	}()

	result, runErr := session.Run(ctx, cypher, params)
	if runErr != nil {
		return nil, fmt.Errorf("neo4j single failed: %w", runErr)
	}

	if !result.Next(ctx) {
		return nil, nil
	}

	record := result.Record()

	if resultErr := result.Err(); resultErr != nil {
		return nil, fmt.Errorf("neo4j single iteration failed: %w", resultErr)
	}

	return record, nil
}
