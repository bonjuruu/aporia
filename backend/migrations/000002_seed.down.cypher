MATCH (n) WHERE n:Thinker OR n:Concept OR n:Claim OR n:Text DETACH DELETE n;
