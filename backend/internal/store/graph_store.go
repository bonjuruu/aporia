package store

import (
	"context"
	"fmt"

	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/util"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type GraphStore interface {
	GetFullGraph(ctx context.Context) (*response.GraphData, error)
	GetSubgraph(ctx context.Context, textID string) (*response.GraphData, error)
	GetPath(ctx context.Context, fromID, toID string) (*response.GraphData, error)
}

type graphStore struct {
	neo4jKit neo4j_kit.Neo4jKit
}

func NewGraphStore(neo4jKit neo4j_kit.Neo4jKit) GraphStore {
	return &graphStore{neo4jKit: neo4jKit}
}

func (s *graphStore) GetFullGraph(ctx context.Context) (*response.GraphData, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (n)
		WHERE n:Thinker OR n:Concept OR n:Claim OR n:Text
		WITH collect({id: n.id, label: coalesce(n.name, n.title, n.content), type: toUpper(labels(n)[0]), year: coalesce(n.born_year, n.published_year, n.year)}) as nodes
		OPTIONAL MATCH (a)-[r]->(b)
		WHERE (a:Thinker OR a:Concept OR a:Claim OR a:Text)
		  AND (b:Thinker OR b:Concept OR b:Claim OR b:Text)
		  AND type(r) <> 'ANNOTATES'
		RETURN nodes, collect(CASE WHEN r IS NOT NULL THEN {id: r.id, source: a.id, target: b.id, type: type(r), description: r.description, source_text_id: r.source_text_id} ELSE NULL END) as edges
	`, nil)
	if singleErr != nil {
		return nil, fmt.Errorf("failed to get full graph: %w", singleErr)
	}

	return mapGraphData(record), nil
}

func (s *graphStore) GetSubgraph(ctx context.Context, textID string) (*response.GraphData, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (n)-[r]->(m)
		WHERE r.source_text_id = $text_id
		  AND (n:Thinker OR n:Concept OR n:Claim OR n:Text)
		  AND (m:Thinker OR m:Concept OR m:Claim OR m:Text)
		WITH collect(DISTINCT {id: n.id, label: coalesce(n.name, n.title, n.content), type: toUpper(labels(n)[0]), year: coalesce(n.born_year, n.published_year, n.year)}) +
			 collect(DISTINCT {id: m.id, label: coalesce(m.name, m.title, m.content), type: toUpper(labels(m)[0]), year: coalesce(m.born_year, m.published_year, m.year)}) as allNodes,
			 collect(DISTINCT {id: r.id, source: n.id, target: m.id, type: type(r), description: r.description, source_text_id: r.source_text_id}) as edges
		UNWIND allNodes as node
		WITH collect(DISTINCT node) as nodes, edges
		RETURN nodes, edges
	`, map[string]any{"text_id": textID})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to get subgraph: %w", singleErr)
	}

	return mapGraphData(record), nil
}

func (s *graphStore) GetPath(ctx context.Context, fromID, toID string) (*response.GraphData, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH path = shortestPath((a {id: $from_id})-[*..15]-(b {id: $to_id}))
		RETURN [node in nodes(path) | {id: node.id, label: coalesce(node.name, node.title, node.content), type: toUpper(labels(node)[0]), year: coalesce(node.born_year, node.published_year, node.year)}] as nodes,
			   [rel in relationships(path) | {id: rel.id, source: startNode(rel).id, target: endNode(rel).id, type: type(rel), description: rel.description, source_text_id: rel.source_text_id}] as edges
	`, map[string]any{"from_id": fromID, "to_id": toID})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to get path: %w", singleErr)
	}

	return mapGraphData(record), nil
}

func mapGraphData(record *neo4j.Record) *response.GraphData {
	graphData := response.NewGraphData()
	if record == nil {
		return graphData
	}

	graphData.Nodes = mapNodeList(record, "nodes")
	graphData.Edges = mapEdgeList(record, "edges")
	return graphData
}

func mapNodeList(record *neo4j.Record, key string) []response.GraphNode {
	nodeList := []response.GraphNode{}

	raw, _ := record.Get(key)
	itemList, ok := raw.([]any)
	if !ok {
		return nodeList
	}

	for _, item := range itemList {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		nodeList = append(nodeList, response.GraphNode{
			ID:    util.ToString(m["id"]),
			Label: util.ToString(m["label"]),
			Type:  models.NodeType(util.ToString(m["type"])),
			Year:  util.ToIntPtr(m["year"]),
		})
	}

	return nodeList
}

func mapEdgeList(record *neo4j.Record, key string) []models.Edge {
	edgeList := []models.Edge{}

	raw, _ := record.Get(key)
	itemList, ok := raw.([]any)
	if !ok {
		return edgeList
	}

	for _, item := range itemList {
		if item == nil {
			continue
		}
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		edgeID := util.ToString(m["id"])
		if edgeID == "" {
			continue
		}
		edgeList = append(edgeList, models.Edge{
			ID:           edgeID,
			Source:       util.ToString(m["source"]),
			Target:       util.ToString(m["target"]),
			Type:         models.EdgeType(util.ToString(m["type"])),
			Description:  util.ToString(m["description"]),
			SourceTextID: util.ToString(m["source_text_id"]),
		})
	}

	return edgeList
}
