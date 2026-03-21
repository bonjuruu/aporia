.PHONY: dev dev-backend dev-frontend db db-stop stop lint lint-frontend lint-backend build

# Run everything: Neo4j + backend + frontend
dev: db
	@trap 'kill 0' EXIT; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-backend:
	cd backend && go run ./cmd/server/

dev-frontend:
	cd frontend && npm run dev

db:
	docker compose up -d

db-stop:
	docker compose down

stop: db-stop

lint: lint-frontend lint-backend

lint-frontend:
	cd frontend && npm run lint && npm run build

lint-backend:
	cd backend && go vet ./...

build:
	cd frontend && npm run build
