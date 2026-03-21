// Quote node constraints and indexes
CREATE CONSTRAINT quote_id IF NOT EXISTS FOR (q:Quote) REQUIRE q.id IS UNIQUE;
CREATE INDEX quote_status IF NOT EXISTS FOR (q:Quote) ON (q.status);
