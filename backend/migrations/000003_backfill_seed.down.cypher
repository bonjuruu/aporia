// Remove backfilled traditions
MATCH (n:Thinker) WHERE n.tradition IS NOT NULL REMOVE n.tradition;

// Remove backfilled claim descriptions
MATCH (n:Claim) WHERE n.description IS NOT NULL REMOVE n.description;

// Clear backfilled source_text_id on edges (reset to empty string)
MATCH ()-[r:COINED {id: "97369bbb-3778-551e-80d4-b9a258c08ab6"}]->() SET r.source_text_id = "";
MATCH ()-[r:COINED {id: "516fa6df-ba51-5ad2-9da2-75920ae1d79d"}]->() SET r.source_text_id = "";
MATCH ()-[r:APPEARS_IN]->() SET r.source_text_id = "";
MATCH ()-[r:RESPONDS_TO {id: "577aaf6c-b58c-5b7d-92d3-50bde20a0853"}]->() SET r.source_text_id = "";
MATCH ()-[r:RESPONDS_TO {id: "60cc5c78-c407-56aa-94ea-bc3ec9d6a413"}]->() SET r.source_text_id = "";
MATCH ()-[r:BUILDS_ON {id: "38c57d36-ed28-5b72-944a-75b0bee8c0b9"}]->() SET r.source_text_id = "";
MATCH ()-[r:BUILDS_ON {id: "37b2c52c-744f-5e83-b10c-dd695e214624"}]->() SET r.source_text_id = "";
