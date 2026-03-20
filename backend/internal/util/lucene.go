package util

import "strings"

// luceneReplacer escapes characters with special meaning in Lucene fulltext queries.
// Backslash must be first to avoid double-escaping.
var luceneReplacer = strings.NewReplacer(
	`\`, `\\`,
	`+`, `\+`,
	`-`, `\-`,
	`!`, `\!`,
	`(`, `\(`,
	`)`, `\)`,
	`{`, `\{`,
	`}`, `\}`,
	`[`, `\[`,
	`]`, `\]`,
	`^`, `\^`,
	`"`, `\"`,
	`~`, `\~`,
	`*`, `\*`,
	`?`, `\?`,
	`:`, `\:`,
	`/`, `\/`,
)

func EscapeLucene(query string) string {
	return luceneReplacer.Replace(query)
}
