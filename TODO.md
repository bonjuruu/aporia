# Remaining Issues

Tracked from full codebase review (2026-03-25). Items are grouped by area and roughly prioritized within each group.

## Security / Auth

- [x] **Bearer token + CSRF conflict** — Fixed: Auth middleware now sets `authMethod` context key ("cookie" or "bearer"). CSRF middleware skips validation for Bearer-authenticated requests since Bearer tokens aren't vulnerable to CSRF.
- [x] **Node Delete has no user scoping** — Intentional: shared graph model, any authenticated user can delete any node. Accepted risk for a personal/small-team app.
- [x] **JWT_SECRET startup guard** — Fixed: `main.go` now refuses to start if `COOKIE_SECURE=true` and `JWT_SECRET` is still the dev default.
- [x] **Rate limiter trusts all proxies** — Fixed: `router.go` now sets `r.TrustedPlatform = "Fly-Client-IP"` when running on Fly.io, so `c.ClientIP()` reads the real client IP.

## Infrastructure / Deploy

- [x] **Dockerfile Go version** — Verified: `golang:1.26.1-alpine` exists on Docker Hub. No change needed.
- [x] **fly.toml missing production env** — Fixed: Added `[env]` section with `COOKIE_SECURE=true` and comments documenting required Fly secrets.
- [x] **fly.toml cold starts** — Fixed: Changed `min_machines_running` from 0 to 1.
- [x] **Swagger UI CDN without SRI** — Fixed: Pinned to `swagger-ui-dist@5.32.1` and added SRI integrity hashes + `crossorigin="anonymous"`.
- [x] **Dockerfile build optimization** — Fixed: Added `-trimpath -ldflags="-s -w"` to `go build`.

## OpenAPI Spec — Fully Rewritten

- [x] **Missing endpoints** — Added all 5 Quote endpoints, all 3 Progress endpoints, `POST /api/auth/logout`
- [x] **Missing schemas** — Added `Quote`, `QuoteStatus`, `CreateQuoteRequest`, `UpdateQuoteRequest`, `ReadingProgress`, `UpdateProgressRequest`, `SessionNote`
- [x] **Field casing** — All fields now use camelCase matching Go JSON tags (`bornYear`, `sourceTextId`, `createdAt`, `userId`, `nodeId`, `publishedYear`, etc.)
- [x] **Wrong response schemas** — Login/Register now correctly show `StatusResponse`
- [x] **Missing fields** — `UpdateNodeRequest` now has required `type`, `CreateNodeRequest` now has `tradition`, `Edge` now has `sourceTextTitle`
- [x] **Auth scheme** — Added `cookieAuth` (apiKey in cookie) as primary, kept `bearerAuth` as documented fallback with CSRF exemption note
- [x] **Error schema** — Updated to include `status` integer field matching actual `ErrorResponse` struct

## Data Integrity

- [x] **Neo4j transaction safety** — Accepted: Promote already uses a single Cypher query that creates the node AND updates the quote atomically. The session-per-query pattern is safe here because it's one auto-committed statement. No change needed unless operations are split into separate calls in the future.
- [x] **Down migrations destroy user data** — Fixed: `000002_seed.down.cypher` now scopes DETACH DELETE to seed node IDs only. `000003_backfill_seed.down.cypher` now scopes property removal to seed node/edge IDs only.
- [x] **Missing DROP INDEX in schema down** — Fixed: `000001_schema.down.cypher` now drops all 11 edge relationship indexes.

## Performance

- [x] **GetFullGraph has no LIMIT** — Accepted: A philosophy graph will have hundreds of nodes, not hundreds of thousands. Adding LIMIT/pagination would require significant query restructuring and frontend changes for marginal benefit. Revisit if the graph grows beyond ~5000 nodes.
