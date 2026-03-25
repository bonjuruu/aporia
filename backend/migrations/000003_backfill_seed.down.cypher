// Remove backfilled traditions from seed thinkers only
MATCH (n:Thinker) WHERE n.id IN ["1337064c-7962-5d42-9f3e-6aab3da87627", "31068223-915b-5133-b9b5-a5240693b6b0", "b9c401cf-dd88-5bbf-8117-e9bb12a5ca15", "7dcaa2bc-7303-5cdb-b585-c144d7030645", "38d4e283-d4aa-5ac1-a461-691d107ddc89", "4d175e5a-a39a-5351-b9de-038c1e75dd8c"] REMOVE n.tradition;

// Remove backfilled claim descriptions from seed claims only
MATCH (n:Claim) WHERE n.id IN ["cacfa5ab-77c8-577f-8b64-bb9b368f112e", "b522d820-3cbe-5f26-9393-81bbc13a1ff9", "6fb3c19f-b845-5efb-acf8-1a1fa1cb1751", "97d54cb7-7360-58a5-9cf9-65f9e55af382", "c79b1dd0-aaaf-5758-904d-cdc2f70e9cfe"] REMOVE n.description;

// Clear backfilled source_text_id on seed edges only
MATCH ()-[r:COINED {id: "97369bbb-3778-551e-80d4-b9a258c08ab6"}]->() SET r.source_text_id = "";
MATCH ()-[r:COINED {id: "516fa6df-ba51-5ad2-9da2-75920ae1d79d"}]->() SET r.source_text_id = "";
MATCH ()-[r:APPEARS_IN]->(t:Text) WHERE t.id IN ["0d232d11-a55e-5b21-bdc1-d0927fbb1dc5", "9c17a3a7-42dd-5233-ab4c-cdedb6884458", "5f1d12e8-740b-5ab2-892a-d6febcf9fe0f", "86e6b758-a32e-5300-9517-480691de595f", "e6697acc-2932-5c6d-b58a-9c01fcca9c65"] SET r.source_text_id = "";
MATCH ()-[r:RESPONDS_TO {id: "577aaf6c-b58c-5b7d-92d3-50bde20a0853"}]->() SET r.source_text_id = "";
MATCH ()-[r:RESPONDS_TO {id: "60cc5c78-c407-56aa-94ea-bc3ec9d6a413"}]->() SET r.source_text_id = "";
MATCH ()-[r:BUILDS_ON {id: "38c57d36-ed28-5b72-944a-75b0bee8c0b9"}]->() SET r.source_text_id = "";
MATCH ()-[r:BUILDS_ON {id: "37b2c52c-744f-5e83-b10c-dd695e214624"}]->() SET r.source_text_id = "";
