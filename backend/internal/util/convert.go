package util

import (
	"fmt"
	"strings"
	"unicode"
)

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

// SnakeToCamel converts a snake_case string to camelCase.
func SnakeToCamel(s string) string {
	partList := strings.Split(s, "_")
	for i := 1; i < len(partList); i++ {
		if len(partList[i]) > 0 {
			runes := []rune(partList[i])
			runes[0] = unicode.ToUpper(runes[0])
			partList[i] = string(runes)
		}
	}
	return strings.Join(partList, "")
}

// CamelizeKeys converts all snake_case keys in a map to camelCase.
func CamelizeKeys(m map[string]any) map[string]any {
	result := make(map[string]any, len(m))
	for key, value := range m {
		result[SnakeToCamel(key)] = value
	}
	return result
}

// DerefOrNil returns the dereferenced value or nil if the pointer is nil.
// Returns any because it's used for Neo4j param maps (map[string]any).
func DerefOrNil[T any](p *T) any {
	if p == nil {
		return nil
	}
	return *p
}
