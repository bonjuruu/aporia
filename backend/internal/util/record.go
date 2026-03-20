package util

import "github.com/neo4j/neo4j-go-driver/v5/neo4j"

func RecordString(record *neo4j.Record, key string) string {
	val, _ := record.Get(key)
	return ToString(val)
}

func RecordIntPtr(record *neo4j.Record, key string) *int {
	val, _ := record.Get(key)
	return ToIntPtr(val)
}
