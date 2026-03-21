package store

import (
	"context"
	"fmt"

	"github.com/bonjuruu/aporia/internal/apperror"
	"github.com/bonjuruu/aporia/internal/kit/neo4j_kit"
	"github.com/bonjuruu/aporia/internal/models"
	"github.com/bonjuruu/aporia/internal/response"
	"github.com/bonjuruu/aporia/internal/util"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"
)

type NodeStore interface {
	GetAll(ctx context.Context) ([]response.GraphNode, error)
	GetByID(ctx context.Context, id string) (*response.NodeDetail, error)
	CreateThinker(ctx context.Context, thinker models.Thinker) (*response.GraphNode, error)
	CreateConcept(ctx context.Context, concept models.Concept) (*response.GraphNode, error)
	CreateClaim(ctx context.Context, claim models.Claim) (*response.GraphNode, error)
	CreateText(ctx context.Context, text models.Text) (*response.GraphNode, error)
	UpdateThinker(ctx context.Context, id string, update models.ThinkerUpdate) error
	UpdateConcept(ctx context.Context, id string, update models.ConceptUpdate) error
	UpdateClaim(ctx context.Context, id string, update models.ClaimUpdate) error
	UpdateText(ctx context.Context, id string, update models.TextUpdate) error
	Delete(ctx context.Context, id string) error
	Search(ctx context.Context, query string) ([]response.GraphNode, error)
	Count(ctx context.Context) (*int64, error)
}

type nodeStore struct {
	neo4jKit neo4j_kit.Neo4jKit
}

func NewNodeStore(neo4jKit neo4j_kit.Neo4jKit) NodeStore {
	return &nodeStore{neo4jKit: neo4jKit}
}

func (s *nodeStore) GetAll(ctx context.Context) ([]response.GraphNode, error) {
	recordList, collectErr := s.neo4jKit.Collect(ctx, `
		MATCH (n)
		WHERE n:Thinker OR n:Concept OR n:Claim OR n:Text
		RETURN n.id as id,
			coalesce(n.name, n.title, n.content) as label,
			toUpper(labels(n)[0]) as type,
			coalesce(n.born_year, n.published_year, n.year) as year
	`, nil)
	if collectErr != nil {
		return nil, fmt.Errorf("failed to get all nodes: %w", collectErr)
	}

	nodeList := []response.GraphNode{}
	for _, record := range recordList {
		node := response.GraphNode{
			ID:    util.RecordString(record, "id"),
			Label: util.RecordString(record, "label"),
			Type:  models.NodeType(util.RecordString(record, "type")),
			Year:  util.RecordIntPtr(record, "year"),
		}
		nodeList = append(nodeList, node)
	}

	return nodeList, nil
}

func (s *nodeStore) GetByID(ctx context.Context, id string) (*response.NodeDetail, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (n {id: $id})
		WHERE n:Thinker OR n:Concept OR n:Claim OR n:Text
		OPTIONAL MATCH (n)-[r]->(out)
		WHERE out:Thinker OR out:Concept OR out:Claim OR out:Text
		WITH n, collect(DISTINCT {edge_id: r.id, edge_type: type(r), edge_desc: r.description, edge_source_text: r.source_text_id, target_id: out.id, target_label: coalesce(out.name, out.title, out.content), target_type: toUpper(labels(out)[0]), target_year: coalesce(out.born_year, out.published_year, out.year)}) as outgoing
		OPTIONAL MATCH (in_node)-[in_r]->(n)
		WHERE in_node:Thinker OR in_node:Concept OR in_node:Claim OR in_node:Text
		RETURN n,
			toUpper(labels(n)[0]) as type,
			outgoing,
			collect(DISTINCT {edge_id: in_r.id, edge_type: type(in_r), edge_desc: in_r.description, edge_source_text: in_r.source_text_id, source_id: in_node.id, source_label: coalesce(in_node.name, in_node.title, in_node.content), source_type: toUpper(labels(in_node)[0]), source_year: coalesce(in_node.born_year, in_node.published_year, in_node.year)}) as incoming
	`, map[string]any{"id": id})
	if singleErr != nil {
		return nil, fmt.Errorf("failed to get node by id: %w", singleErr)
	}

	if record == nil {
		return nil, nil
	}

	nodeVal, _ := record.Get("n")
	nodeType := util.RecordString(record, "type")

	node, ok := nodeVal.(dbtype.Node)
	if !ok {
		return nil, fmt.Errorf("unexpected node type: %T", nodeVal)
	}
	props := node.Props
	detail := &response.NodeDetail{
		ID:         id,
		Type:       models.NodeType(nodeType),
		Properties: props,
		Outgoing:   []response.ConnectionEntry{},
		Incoming:   []response.ConnectionEntry{},
	}

	outgoingRaw, _ := record.Get("outgoing")
	if outList, ok := outgoingRaw.([]any); ok {
		for _, item := range outList {
			m, ok := item.(map[string]any)
			if !ok {
				continue
			}
			edgeID := util.ToString(m["edge_id"])
			if edgeID == "" {
				continue
			}
			entry := response.ConnectionEntry{
				Edge: models.Edge{
					ID:           edgeID,
					Source:       id,
					Target:       util.ToString(m["target_id"]),
					Type:         models.EdgeType(util.ToString(m["edge_type"])),
					Description:  util.ToString(m["edge_desc"]),
					SourceTextID: util.ToString(m["edge_source_text"]),
				},
				Node: response.GraphNode{
					ID:    util.ToString(m["target_id"]),
					Label: util.ToString(m["target_label"]),
					Type:  models.NodeType(util.ToString(m["target_type"])),
					Year:  util.ToIntPtr(m["target_year"]),
				},
			}
			detail.Outgoing = append(detail.Outgoing, entry)
		}
	}

	incomingRaw, _ := record.Get("incoming")
	if inList, ok := incomingRaw.([]any); ok {
		for _, item := range inList {
			m, ok := item.(map[string]any)
			if !ok {
				continue
			}
			edgeID := util.ToString(m["edge_id"])
			if edgeID == "" {
				continue
			}
			entry := response.ConnectionEntry{
				Edge: models.Edge{
					ID:           edgeID,
					Source:       util.ToString(m["source_id"]),
					Target:       id,
					Type:         models.EdgeType(util.ToString(m["edge_type"])),
					Description:  util.ToString(m["edge_desc"]),
					SourceTextID: util.ToString(m["edge_source_text"]),
				},
				Node: response.GraphNode{
					ID:    util.ToString(m["source_id"]),
					Label: util.ToString(m["source_label"]),
					Type:  models.NodeType(util.ToString(m["source_type"])),
					Year:  util.ToIntPtr(m["source_year"]),
				},
			}
			detail.Incoming = append(detail.Incoming, entry)
		}
	}

	return detail, nil
}

func (s *nodeStore) CreateThinker(ctx context.Context, thinker models.Thinker) (*response.GraphNode, error) {
	params := map[string]any{
		"id":          thinker.ID,
		"name":        thinker.Name,
		"description": thinker.Description,
		"notes":       thinker.Notes,
		"born_year":   util.DerefOrNil(thinker.BornYear),
		"died_year":   util.DerefOrNil(thinker.DiedYear),
	}

	runErr := s.neo4jKit.Run(ctx, `
		CREATE (n:Thinker {
			id: $id,
			name: $name,
			description: $description,
			notes: $notes,
			born_year: $born_year,
			died_year: $died_year
		})
		RETURN n
	`, params)
	if runErr != nil {
		return nil, fmt.Errorf("failed to create thinker: %w", runErr)
	}

	graphNode := &response.GraphNode{
		ID:    thinker.ID,
		Label: thinker.Name,
		Type:  models.NodeTypeThinker,
		Year:  thinker.BornYear,
	}

	return graphNode, nil
}

func (s *nodeStore) CreateConcept(ctx context.Context, concept models.Concept) (*response.GraphNode, error) {
	params := map[string]any{
		"id":          concept.ID,
		"name":        concept.Name,
		"description": concept.Description,
		"notes":       concept.Notes,
		"year":        util.DerefOrNil(concept.Year),
	}

	runErr := s.neo4jKit.Run(ctx, `
		CREATE (n:Concept {
			id: $id,
			name: $name,
			description: $description,
			notes: $notes,
			year: $year
		})
		RETURN n
	`, params)
	if runErr != nil {
		return nil, fmt.Errorf("failed to create concept: %w", runErr)
	}

	graphNode := &response.GraphNode{
		ID:    concept.ID,
		Label: concept.Name,
		Type:  models.NodeTypeConcept,
		Year:  concept.Year,
	}

	return graphNode, nil
}

func (s *nodeStore) CreateClaim(ctx context.Context, claim models.Claim) (*response.GraphNode, error) {
	params := map[string]any{
		"id":      claim.ID,
		"content": claim.Content,
		"notes":   claim.Notes,
		"year":    util.DerefOrNil(claim.Year),
	}

	runErr := s.neo4jKit.Run(ctx, `
		CREATE (n:Claim {
			id: $id,
			content: $content,
			notes: $notes,
			year: $year
		})
		RETURN n
	`, params)
	if runErr != nil {
		return nil, fmt.Errorf("failed to create claim: %w", runErr)
	}

	graphNode := &response.GraphNode{
		ID:    claim.ID,
		Label: claim.Content,
		Type:  models.NodeTypeClaim,
		Year:  claim.Year,
	}

	return graphNode, nil
}

func (s *nodeStore) CreateText(ctx context.Context, text models.Text) (*response.GraphNode, error) {
	params := map[string]any{
		"id":             text.ID,
		"title":          text.Title,
		"description":    text.Description,
		"notes":          text.Notes,
		"published_year": util.DerefOrNil(text.PublishedYear),
	}

	runErr := s.neo4jKit.Run(ctx, `
		CREATE (n:Text {
			id: $id,
			title: $title,
			description: $description,
			notes: $notes,
			published_year: $published_year
		})
		RETURN n
	`, params)
	if runErr != nil {
		return nil, fmt.Errorf("failed to create text: %w", runErr)
	}

	graphNode := &response.GraphNode{
		ID:    text.ID,
		Label: text.Title,
		Type:  models.NodeTypeText,
		Year:  text.PublishedYear,
	}

	return graphNode, nil
}

func (s *nodeStore) UpdateThinker(ctx context.Context, id string, update models.ThinkerUpdate) error {
	props := make(map[string]any)
	if update.Name != nil {
		props["name"] = *update.Name
	}
	if update.Description != nil {
		props["description"] = *update.Description
	}
	if update.Notes != nil {
		props["notes"] = *update.Notes
	}
	if update.BornYear != nil {
		props["born_year"] = *update.BornYear
	}
	if update.DiedYear != nil {
		props["died_year"] = *update.DiedYear
	}

	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (n:Thinker {id: $id})
		SET n += $props
		RETURN n.id as id
	`, map[string]any{"id": id, "props": props})
	if singleErr != nil {
		return fmt.Errorf("failed to update thinker: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("not found")
	}
	return nil
}

func (s *nodeStore) UpdateConcept(ctx context.Context, id string, update models.ConceptUpdate) error {
	props := make(map[string]any)
	if update.Name != nil {
		props["name"] = *update.Name
	}
	if update.Description != nil {
		props["description"] = *update.Description
	}
	if update.Notes != nil {
		props["notes"] = *update.Notes
	}
	if update.Year != nil {
		props["year"] = *update.Year
	}

	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (n:Concept {id: $id})
		SET n += $props
		RETURN n.id as id
	`, map[string]any{"id": id, "props": props})
	if singleErr != nil {
		return fmt.Errorf("failed to update concept: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("not found")
	}
	return nil
}

func (s *nodeStore) UpdateClaim(ctx context.Context, id string, update models.ClaimUpdate) error {
	props := make(map[string]any)
	if update.Content != nil {
		props["content"] = *update.Content
	}
	if update.Notes != nil {
		props["notes"] = *update.Notes
	}
	if update.Year != nil {
		props["year"] = *update.Year
	}

	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (n:Claim {id: $id})
		SET n += $props
		RETURN n.id as id
	`, map[string]any{"id": id, "props": props})
	if singleErr != nil {
		return fmt.Errorf("failed to update claim: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("not found")
	}
	return nil
}

func (s *nodeStore) UpdateText(ctx context.Context, id string, update models.TextUpdate) error {
	props := make(map[string]any)
	if update.Title != nil {
		props["title"] = *update.Title
	}
	if update.Description != nil {
		props["description"] = *update.Description
	}
	if update.Notes != nil {
		props["notes"] = *update.Notes
	}
	if update.PublishedYear != nil {
		props["published_year"] = *update.PublishedYear
	}

	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (n:Text {id: $id})
		SET n += $props
		RETURN n.id as id
	`, map[string]any{"id": id, "props": props})
	if singleErr != nil {
		return fmt.Errorf("failed to update text: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("not found")
	}
	return nil
}

func (s *nodeStore) Delete(ctx context.Context, id string) error {
	record, singleErr := s.neo4jKit.Single(ctx, `
		MATCH (n {id: $id})
		WHERE n:Thinker OR n:Concept OR n:Claim OR n:Text
		WITH n, n.id as nodeId
		DETACH DELETE n
		RETURN nodeId
	`, map[string]any{"id": id})
	if singleErr != nil {
		return fmt.Errorf("failed to delete node: %w", singleErr)
	}
	if record == nil {
		return apperror.NewNotFound("not found")
	}

	return nil
}

func (s *nodeStore) Search(ctx context.Context, query string) ([]response.GraphNode, error) {
	recordList, collectErr := s.neo4jKit.Collect(ctx, `
		CALL db.index.fulltext.queryNodes("nodeSearch", $query)
		YIELD node as n, score
		RETURN n.id as id,
			coalesce(n.name, n.title, n.content) as label,
			toUpper(labels(n)[0]) as type,
			coalesce(n.born_year, n.published_year, n.year) as year
		LIMIT 20
	`, map[string]any{"query": query})
	if collectErr != nil {
		return nil, fmt.Errorf("failed to search nodes: %w", collectErr)
	}

	nodeList := []response.GraphNode{}
	for _, record := range recordList {
		node := response.GraphNode{
			ID:    util.RecordString(record, "id"),
			Label: util.RecordString(record, "label"),
			Type:  models.NodeType(util.RecordString(record, "type")),
			Year:  util.RecordIntPtr(record, "year"),
		}
		nodeList = append(nodeList, node)
	}

	return nodeList, nil
}

func (s *nodeStore) Count(ctx context.Context) (*int64, error) {
	record, singleErr := s.neo4jKit.Single(ctx, `MATCH (n) WHERE n:Thinker OR n:Concept OR n:Claim OR n:Text RETURN count(n) as count`, nil)
	if singleErr != nil {
		return nil, fmt.Errorf("failed to count nodes: %w", singleErr)
	}

	if record == nil {
		count := int64(0)
		return &count, nil
	}

	countVal, _ := record.Get("count")
	if count, ok := countVal.(int64); ok {
		return &count, nil
	}

	count := int64(0)
	return &count, nil
}
