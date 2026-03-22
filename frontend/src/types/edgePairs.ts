import { EDGE_TYPES } from '.'
import type { EdgeType, NodeType } from '.'

/** Valid (source, target) node type pairs for each edge type. */
export const VALID_PAIRS: Record<EdgeType, [NodeType, NodeType][]> = {
  INFLUENCED:   [['THINKER', 'THINKER']],
  COINED:       [['THINKER', 'CONCEPT']],
  WROTE:        [['THINKER', 'TEXT']],
  ARGUES:       [['CLAIM', 'CLAIM'], ['CLAIM', 'CONCEPT'], ['TEXT', 'CLAIM']],
  APPEARS_IN:   [['THINKER', 'TEXT'], ['CONCEPT', 'TEXT'], ['CLAIM', 'TEXT']],
  REFUTES:      [['CLAIM', 'CLAIM']],
  SUPPORTS:     [['CLAIM', 'CLAIM']],
  QUALIFIES:    [['CLAIM', 'CLAIM']],
  BUILDS_ON:    [['CONCEPT', 'CONCEPT'], ['CLAIM', 'CLAIM'], ['CONCEPT', 'CLAIM'], ['CLAIM', 'CONCEPT']],
  DERIVES_FROM: [['CONCEPT', 'CONCEPT'], ['CLAIM', 'CLAIM'], ['CONCEPT', 'CLAIM'], ['CLAIM', 'CONCEPT']],
  RESPONDS_TO:  [['TEXT', 'TEXT'], ['CLAIM', 'CLAIM']],
}

export function pairMatches(pairs: [NodeType, NodeType][], a: NodeType, b: NodeType): boolean {
  return pairs.some(([s, t]) => (s === a && t === b) || (s === b && t === a))
}

/** Filter edge types valid for the given pair of node types (order-insensitive). */
export function getValidEdgeTypesForPair(a: NodeType, b: NodeType): EdgeType[] {
  return EDGE_TYPES.filter(et => pairMatches(VALID_PAIRS[et], a, b))
}

/** Infer direction for a TEXT node: check if (other → text) is a valid pair, otherwise (text → other). */
export function inferSourceTargetForText(edgeType: EdgeType, otherType: NodeType, textId: string, otherId: string) {
  const pairs = VALID_PAIRS[edgeType]
  if (pairs.some(([s, t]) => s === otherType && t === 'TEXT')) {
    return { source: otherId, target: textId }
  }
  return { source: textId, target: otherId }
}
