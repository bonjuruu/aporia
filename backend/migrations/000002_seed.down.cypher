// Delete seed thinkers
MATCH (n:Thinker) WHERE n.id IN ["1337064c-7962-5d42-9f3e-6aab3da87627", "31068223-915b-5133-b9b5-a5240693b6b0", "b9c401cf-dd88-5bbf-8117-e9bb12a5ca15", "7dcaa2bc-7303-5cdb-b585-c144d7030645", "38d4e283-d4aa-5ac1-a461-691d107ddc89", "4d175e5a-a39a-5351-b9de-038c1e75dd8c"] DETACH DELETE n;

// Delete seed concepts
MATCH (n:Concept) WHERE n.id IN ["54a07857-3a77-57d9-8c0c-6508c6a47495", "41cc0490-22fd-559b-86e0-0d306c1ce818", "ed946b65-4c40-598c-a732-820b598b88f2", "5dff2ae3-bb01-5d22-ba7d-8af083113f34", "c8cd9ef7-33b4-5d52-b1bb-ea2eabe983dc", "9cc5129f-0525-5e74-8917-b88878c1a69a", "149b3065-f227-5733-951a-6699494053a0"] DETACH DELETE n;

// Delete seed claims
MATCH (n:Claim) WHERE n.id IN ["cacfa5ab-77c8-577f-8b64-bb9b368f112e", "b522d820-3cbe-5f26-9393-81bbc13a1ff9", "6fb3c19f-b845-5efb-acf8-1a1fa1cb1751", "97d54cb7-7360-58a5-9cf9-65f9e55af382", "c79b1dd0-aaaf-5758-904d-cdc2f70e9cfe"] DETACH DELETE n;

// Delete seed texts
MATCH (n:Text) WHERE n.id IN ["0d232d11-a55e-5b21-bdc1-d0927fbb1dc5", "9c17a3a7-42dd-5233-ab4c-cdedb6884458", "5f1d12e8-740b-5ab2-892a-d6febcf9fe0f", "86e6b758-a32e-5300-9517-480691de595f", "e6697acc-2932-5c6d-b58a-9c01fcca9c65"] DETACH DELETE n;
