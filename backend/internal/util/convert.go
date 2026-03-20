package util

import "fmt"

func ToString(val any) string {
	if val == nil {
		return ""
	}
	if s, ok := val.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", val)
}

func ToIntPtr(val any) *int {
	if val == nil {
		return nil
	}
	switch v := val.(type) {
	case int64:
		i := int(v)
		return &i
	case float64:
		i := int(v)
		return &i
	}
	return nil
}

// DerefOrNil returns the dereferenced value or nil if the pointer is nil.
// Returns any because it's used for Neo4j param maps (map[string]any).
func DerefOrNil[T any](p *T) any {
	if p == nil {
		return nil
	}
	return *p
}
