# Aporia

A personal philosophy graph explorer for mapping arguments, claims, concepts, and thinkers as you read. Built with a Nier Automata-inspired aesthetic — dark, monospaced, archival.

You read a book. A passage stops you. You drop it into the quote vault — raw, unprocessed. Later, you promote it into the graph as a claim, concept, or connection. Over time the graph becomes a personal record of your engagement with philosophy — not just what you've read, but what you've understood, questioned, and disagreed with.

## Features

- **Interactive graph** — Force-directed D3 visualization with per-type node shapes, drag, zoom/pan, hover neighbor dimming, and edge labels
- **Four node types** — Thinkers, Concepts, Claims, and Texts with type-specific detail panels and inline editing
- **Curation UI** — Add nodes and edges from the graph view, with search-and-select for targets and optional source text tagging
- **Reading mode** — Text-scoped subgraph view with a sidebar for quick node/edge creation while reading
- **Quote vault** — Low-friction capture of raw passages, then promote them into structured graph nodes via a side-by-side flow
- **Reading progress** — Chapter tracking with progress rings on text nodes, session log, and a progress overview panel
- **Time slider** — Scrub through history to watch ideas propagate chronologically, with animated playback
- **Path traversal** — Find the shortest path between any two nodes and render it as a highlighted chain
- **Nier aesthetic** — Monospace + serif typography, warm dark palette, terminal-style panels, noise texture, no rounded corners

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, D3 v7 |
| Backend | Go, Gin |
| Database | Neo4j |
| Auth | Cookie-based JWT + CSRF double-submit |

## Prerequisites

- [Go 1.24+](https://go.dev/dl/)
- [Node.js 24+](https://nodejs.org/)
- [Docker](https://docs.docker.com/get-docker/)

## Getting Started

The fastest way to run everything:

```bash
make dev
```

This starts Neo4j (Docker), the Go backend on `:8080`, and the Vite frontend on `:5173`. On first boot, the backend runs migrations and seeds the graph with 6 thinkers, 7 concepts, 5 claims, 5 texts, and ~41 edges.

Or run each piece individually:

```bash
make db              # Neo4j only
make dev-backend     # Go API server
make dev-frontend    # Vite dev server
```

Other commands:

```bash
make lint            # ESLint + tsc + go vet
make build           # Production frontend build
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j connection URI |
| `NEO4J_USERNAME` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `password` | Neo4j password |
| `PORT` | `8080` | API server port |
| `JWT_SECRET` | `aporia-dev-secret-change-in-production` | Secret key for JWT signing |
| `COOKIE_SECURE` | `false` | Set `true` in production (requires HTTPS) |
| `ALLOW_ORIGIN` | `http://localhost:5173` | CORS origin for frontend |

### Useful URLs

- Frontend: http://localhost:5173
- API: http://localhost:8080
- Swagger UI: http://localhost:8080/api/docs
- Neo4j Browser: http://localhost:7474

## Data Model

### Node Types

- **Thinker** — A philosopher. Has name, birth/death year, description.
- **Concept** — A named idea (e.g. *The Absurd*, *Will to Power*). Has name, year, description.
- **Claim** — A specific position (e.g. *"One must imagine Sisyphus happy"*). Has content, year.
- **Text** — A book, essay, or lecture. Has title, published year, description.

### Edge Types

| Type | Meaning |
|---|---|
| `influenced` | Thinker shaped another thinker's thinking |
| `coined` | Thinker originated a concept |
| `wrote` | Thinker authored a text |
| `argues` | Thinker holds a claim |
| `appears_in` | Claim or concept is developed in a text |
| `refutes` | Claim directly contradicts another claim |
| `supports` | Claim provides evidence for another claim |
| `qualifies` | Claim partially agrees — "yes, but..." |
| `builds_on` | Idea depends on another idea |
| `derives_from` | Concept emerges from another concept |
| `responds_to` | Claim responds to another position |

Every edge can optionally carry a description and a source text reference.

## API

Auth is cookie-based — the backend sets an httpOnly JWT cookie on login/register, with CSRF protection via double-submit token.

### Auth (public)

```
POST /api/auth/register    # Create account, sets JWT cookie
POST /api/auth/login       # Sets JWT cookie
POST /api/auth/logout      # Clears JWT cookie
GET  /api/auth/me          # Current user from cookie
```

### Graph

```
GET  /api/graph                     # Full graph (nodes + edges)
GET  /api/graph/subgraph/:textId    # Subgraph scoped to a text
GET  /api/graph/path?from=&to=      # Shortest path between two nodes
```

### Nodes

```
GET    /api/nodes          # List all nodes
GET    /api/nodes/:id      # Single node with connections
POST   /api/nodes          # Create node
PUT    /api/nodes/:id      # Update node
DELETE /api/nodes/:id      # Delete node
GET    /api/search?q=      # Full-text search across nodes
```

### Edges

```
POST   /api/edges          # Create edge
PUT    /api/edges/:id      # Update edge
DELETE /api/edges/:id      # Delete edge
```

### Quotes

```
GET    /api/quotes          # List quotes for current user
POST   /api/quotes          # Capture a quote
PUT    /api/quotes/:id      # Update a quote
DELETE /api/quotes/:id      # Delete a quote
POST   /api/quotes/:id/promote  # Promote quote to graph node
```

### Reading Progress

```
GET  /api/progress           # All reading progress for current user
GET  /api/progress/:textId   # Progress for a specific text
PUT  /api/progress/:textId   # Update progress (chapter, session note)
```

### Annotations

```
GET /api/annotations            # All annotations for current user
PUT /api/annotations/:nodeId    # Upsert stance + notes on a node
```

## Deployment

The app deploys as a single Docker container — the Go backend serves the built frontend as static files. No separate frontend host needed.

### Prerequisites

- [Fly.io CLI](https://fly.io/docs/flyctl/install/) (`brew install flyctl`)
- A [Neo4j AuraDB](https://console.neo4j.io) free instance (200K nodes, no credit card)

### Steps

1. **Create AuraDB instance** at https://console.neo4j.io. Save the connection URI and password — they're only shown once.

2. **Launch the Fly app:**

```bash
fly auth login
fly launch --no-deploy
```

3. **Set production secrets:**

```bash
fly secrets set \
  NEO4J_URI="neo4j+s://xxxx.databases.neo4j.io" \
  NEO4J_USERNAME="neo4j" \
  NEO4J_PASSWORD="<your-auradb-password>" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  COOKIE_SECURE="true" \
  ALLOW_ORIGIN="https://<your-app-name>.fly.dev" \
  GIN_MODE="release"
```

4. **Deploy:**

```bash
fly deploy
```

The Dockerfile builds the frontend, compiles the Go backend, and packages everything into a minimal Alpine image. Migrations run automatically on startup.

### Custom Domain

You get `https://<app-name>.fly.dev` with auto-SSL for free. For a custom domain:

```bash
fly certs add your-domain.com
```

Then add the DNS records Fly provides and update `ALLOW_ORIGIN` to match.

### AuraDB Free Tier Note

The free tier pauses after 3 days of no queries. If that happens, resume it from the AuraDB console — takes about a minute. To prevent pauses, set up a health check or cron that pings the database periodically.
