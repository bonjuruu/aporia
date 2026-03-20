# Aporia

A personal philosophy graph explorer for mapping arguments, claims, concepts, and thinkers as you read. Built with a Nier Automata-inspired aesthetic.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, D3.js
- **Backend:** Go, Gin
- **Database:** Neo4j

## Prerequisites

- [Go 1.26+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://docs.docker.com/get-docker/)

## Getting Started

### 1. Start Neo4j

```bash
docker compose up -d
```

This starts Neo4j on port 7687 (bolt) and 7474 (browser UI). You can access the Neo4j browser at http://localhost:7474.

### 2. Run the Backend

```bash
cd backend
go run ./cmd/server/
```

The API starts on http://localhost:8080. On first boot, it seeds the database with an initial philosophy graph (6 thinkers, 7 concepts, 5 claims, 5 texts, and their relationships).

#### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j connection URI |
| `NEO4J_USERNAME` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `password` | Neo4j password |
| `PORT` | `8080` | API server port |
| `JWT_SECRET` | `change-me-in-production` | Secret key for JWT signing |

### 3. API Overview

#### Auth (public)

```
POST /api/auth/register    # Create account (email + password)
POST /api/auth/login       # Returns JWT token
```

#### Graph (requires JWT)

```
GET  /api/graph                     # Full graph (nodes + edges)
GET  /api/graph/subgraph/:textId    # Subgraph scoped to a text
GET  /api/graph/path?from=id&to=id  # Shortest path between two nodes
```

#### Nodes (requires JWT)

```
GET    /api/nodes          # List all nodes
GET    /api/nodes/:id      # Single node with connections
POST   /api/nodes          # Create node
PUT    /api/nodes/:id      # Update node
DELETE /api/nodes/:id      # Delete node
GET    /api/search?q=      # Full-text search across nodes
```

#### Edges (requires JWT)

```
POST   /api/edges          # Create edge
PUT    /api/edges/:id      # Update edge
DELETE /api/edges/:id      # Delete edge
```

#### Annotations (requires JWT)

```
GET /api/annotations            # All annotations for current user
PUT /api/annotations/:nodeId    # Upsert stance + notes on a node
```

All authenticated requests require an `Authorization: Bearer <token>` header.
