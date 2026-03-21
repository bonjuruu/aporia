package db

import "testing"

func TestStripCypherComments(t *testing.T) {
	testCaseList := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Should strip single comment line",
			input:    "// this is a comment\nMATCH (n) RETURN n",
			expected: "MATCH (n) RETURN n",
		},
		{
			name:     "Should strip multiple comment lines mixed with code",
			input:    "// comment one\nCREATE (n:Thinker {name: 'Plato'})\n// comment two\nRETURN n",
			expected: "CREATE (n:Thinker {name: 'Plato'})\nRETURN n",
		},
		{
			name:     "Should pass through statement with no comments",
			input:    "MATCH (n)\nRETURN n",
			expected: "MATCH (n)\nRETURN n",
		},
		{
			name:     "Should handle empty input",
			input:    "",
			expected: "",
		},
		{
			name:     "Should strip comment with leading whitespace",
			input:    "  // indented comment\nMATCH (n) RETURN n",
			expected: "MATCH (n) RETURN n",
		},
		{
			name:     "Should not strip inline comment-like content in strings",
			input:    "CREATE (n:Thinker {name: 'http://example.com'})",
			expected: "CREATE (n:Thinker {name: 'http://example.com'})",
		},
		{
			name:     "Should handle all comment lines",
			input:    "// first\n// second",
			expected: "",
		},
	}

	for _, testCase := range testCaseList {
		t.Run(testCase.name, func(t *testing.T) {
			result := stripCypherComments(testCase.input)
			if result != testCase.expected {
				t.Errorf("stripCypherComments(%q)\n  got:  %q\n  want: %q", testCase.input, result, testCase.expected)
			}
		})
	}
}
