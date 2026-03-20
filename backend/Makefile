.PHONY: test test-v test-unit test-e2e lint mocks build tidy

test:
	go test ./... -count=1

test-v:
	go test ./... -v -count=1

test-unit:
	go test ./internal/... -count=1

test-e2e:
	docker compose -f e2e/docker-compose.yml up -d
	@echo "Waiting for Neo4j..."
	@for i in $$(seq 1 30); do curl -sf http://localhost:7475 > /dev/null && break || sleep 1; done
	NEO4J_URI=bolt://localhost:7688 NEO4J_PASSWORD=testpassword go test ./e2e/... -v -count=1; \
		EXIT_CODE=$$?; \
		docker compose -f e2e/docker-compose.yml down -v; \
		exit $$EXIT_CODE

lint:
	golangci-lint run ./...

mocks:
	mockery
	go mod tidy

build:
	go build ./...

tidy:
	go mod tidy
