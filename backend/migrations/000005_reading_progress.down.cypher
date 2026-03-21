// Remove all READING relationships
MATCH ()-[r:READING]->() DELETE r;
