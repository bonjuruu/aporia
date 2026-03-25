package models

import (
	"fmt"
	"strings"
)

type EdgeType string

const (
	EdgeTypeInfluenced  EdgeType = "INFLUENCED"
	EdgeTypeCoined      EdgeType = "COINED"
	EdgeTypeWrote       EdgeType = "WROTE"
	EdgeTypeArgues      EdgeType = "ARGUES"
	EdgeTypeAppearsIn   EdgeType = "APPEARS_IN"
	EdgeTypeRefutes     EdgeType = "REFUTES"
	EdgeTypeSupports    EdgeType = "SUPPORTS"
	EdgeTypeQualifies   EdgeType = "QUALIFIES"
	EdgeTypeBuildsOn    EdgeType = "BUILDS_ON"
	EdgeTypeDerivesFrom EdgeType = "DERIVES_FROM"
	EdgeTypeRespondsTo  EdgeType = "RESPONDS_TO"
)

var validEdgeTypes = map[EdgeType]bool{
	EdgeTypeInfluenced:  true,
	EdgeTypeCoined:      true,
	EdgeTypeWrote:       true,
	EdgeTypeArgues:      true,
	EdgeTypeAppearsIn:   true,
	EdgeTypeRefutes:     true,
	EdgeTypeSupports:    true,
	EdgeTypeQualifies:   true,
	EdgeTypeBuildsOn:    true,
	EdgeTypeDerivesFrom: true,
	EdgeTypeRespondsTo:  true,
}

func ValidEdgeType(t EdgeType) bool {
	return validEdgeTypes[t]
}

// CanonicalEdgeTypes returns all valid edge types as a slice.
func CanonicalEdgeTypes() []EdgeType {
	return []EdgeType{
		EdgeTypeInfluenced, EdgeTypeCoined, EdgeTypeWrote, EdgeTypeArgues,
		EdgeTypeAppearsIn, EdgeTypeRefutes, EdgeTypeSupports, EdgeTypeQualifies,
		EdgeTypeBuildsOn, EdgeTypeDerivesFrom, EdgeTypeRespondsTo,
	}
}

// CypherRelTypes returns a Cypher relationship type pattern like "INFLUENCED|COINED|WROTE|...".
func CypherRelTypes() string {
	types := CanonicalEdgeTypes()
	parts := make([]string, len(types))
	for i, t := range types {
		parts[i] = string(t)
	}
	return strings.Join(parts, "|")
}

type Edge struct {
	ID              string   `json:"id"`
	Source          string   `json:"source"`
	Target          string   `json:"target"`
	Type            EdgeType `json:"type"`
	Description     string   `json:"description"`
	SourceTextID    string   `json:"sourceTextId"`
	SourceTextTitle string   `json:"sourceTextTitle,omitempty"`
}

func (e Edge) String() string {
	return fmt.Sprintf("Edge{id:%s, source:%s, target:%s, type:%s}", e.ID, e.Source, e.Target, e.Type)
}

type EdgeUpdate struct {
	Description  *string `json:"description,omitempty"`
	SourceTextID *string `json:"sourceTextId,omitempty"`
}
