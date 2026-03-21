// Backfill thinker traditions
MATCH (n:Thinker {id: "1337064c-7962-5d42-9f3e-6aab3da87627"}) SET n.tradition = "German Idealism, Pessimism", n.born_year = coalesce(n.born_year, 1788), n.died_year = coalesce(n.died_year, 1860);
MATCH (n:Thinker {id: "31068223-915b-5133-b9b5-a5240693b6b0"}) SET n.tradition = "Existentialism, Christian Philosophy", n.born_year = coalesce(n.born_year, 1813), n.died_year = coalesce(n.died_year, 1855);
MATCH (n:Thinker {id: "b9c401cf-dd88-5bbf-8117-e9bb12a5ca15"}) SET n.tradition = "Existentialism, Nihilism", n.born_year = coalesce(n.born_year, 1844), n.died_year = coalesce(n.died_year, 1900);
MATCH (n:Thinker {id: "7dcaa2bc-7303-5cdb-b585-c144d7030645"}) SET n.tradition = "Absurdism", n.born_year = coalesce(n.born_year, 1913), n.died_year = coalesce(n.died_year, 1960);
MATCH (n:Thinker {id: "38d4e283-d4aa-5ac1-a461-691d107ddc89"}) SET n.tradition = "Existentialism, Phenomenology", n.born_year = coalesce(n.born_year, 1905), n.died_year = coalesce(n.died_year, 1980);
MATCH (n:Thinker {id: "4d175e5a-a39a-5351-b9de-038c1e75dd8c"}) SET n.tradition = "Existentialism, Feminism", n.born_year = coalesce(n.born_year, 1908), n.died_year = coalesce(n.died_year, 1986);

// Backfill claim descriptions
MATCH (n:Claim {id: "cacfa5ab-77c8-577f-8b64-bb9b368f112e"}) SET n.description = "Nietzsche's proclamation in The Gay Science that modern civilization has rendered God irrelevant, leaving a vacuum of meaning and value";
MATCH (n:Claim {id: "b522d820-3cbe-5f26-9393-81bbc13a1ff9"}) SET n.description = "Camus's concluding insight that embracing the absurd struggle itself, without hope of resolution, constitutes authentic happiness";
MATCH (n:Claim {id: "6fb3c19f-b845-5efb-acf8-1a1fa1cb1751"}) SET n.description = "Sartre's foundational existentialist principle that humans have no predetermined nature — we first exist, then define ourselves through choices";
MATCH (n:Claim {id: "97d54cb7-7360-58a5-9cf9-65f9e55af382"}) SET n.description = "Camus's argument that acknowledging the absurd does not lead to resignation but to passionate rebellion and living fully";
MATCH (n:Claim {id: "c79b1dd0-aaaf-5758-904d-cdc2f70e9cfe"}) SET n.description = "Schopenhauer's central thesis that the blind, insatiable striving of the Will traps us in endless cycles of desire and pain";

// Backfill source_text_id on edges that were missing them
// Coined: Will to Power -> Zarathustra
MATCH (:Thinker {id: "b9c401cf-dd88-5bbf-8117-e9bb12a5ca15"})-[r:COINED {id: "97369bbb-3778-551e-80d4-b9a258c08ab6"}]->(:Concept) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = "9c17a3a7-42dd-5233-ab4c-cdedb6884458";
// Coined: Nihilism -> The Gay Science
MATCH (:Thinker {id: "b9c401cf-dd88-5bbf-8117-e9bb12a5ca15"})-[r:COINED {id: "516fa6df-ba51-5ad2-9da2-75920ae1d79d"}]->(:Concept) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = "0d232d11-a55e-5b21-bdc1-d0927fbb1dc5";

// Appears_in: set source_text_id to the target text
MATCH (a)-[r:APPEARS_IN {id: "911aeeb0-5183-52e2-b758-fe0abe7a44ce"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "15b113f8-989e-59e0-822f-d65bbf13816a"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "f49c3002-b5db-5319-81dc-60f443196b43"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "232a9754-9755-5d1b-a601-c27f79347864"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "55e3eb17-2b71-5a0d-b305-815703220096"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "717d3bff-dada-5ec3-8d1b-e9393504a715"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "36fcdd29-ad0e-53b2-808c-35c686b3fcde"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "064a8173-95aa-5a42-8dbe-6138bb028e18"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "d15efd76-8715-501b-b707-a91cdca6a883"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "896726e1-309c-5399-a1f6-07cc6051b567"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;
MATCH (a)-[r:APPEARS_IN {id: "4a6bf222-341d-5029-9b88-311b948896f8"}]->(b:Text) WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = b.id;

// Responds_to / Builds_on: add source_text_id where the source text is known
MATCH ()-[r:RESPONDS_TO {id: "577aaf6c-b58c-5b7d-92d3-50bde20a0853"}]->() WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = "5f1d12e8-740b-5ab2-892a-d6febcf9fe0f";
MATCH ()-[r:RESPONDS_TO {id: "60cc5c78-c407-56aa-94ea-bc3ec9d6a413"}]->() WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = "5f1d12e8-740b-5ab2-892a-d6febcf9fe0f";
MATCH ()-[r:BUILDS_ON {id: "38c57d36-ed28-5b72-944a-75b0bee8c0b9"}]->() WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = "5f1d12e8-740b-5ab2-892a-d6febcf9fe0f";
MATCH ()-[r:BUILDS_ON {id: "37b2c52c-744f-5e83-b10c-dd695e214624"}]->() WHERE r.source_text_id IS NULL OR r.source_text_id = "" SET r.source_text_id = "86e6b758-a32e-5300-9517-480691de595f";
