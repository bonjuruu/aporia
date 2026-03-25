# Stage 1: Build frontend
FROM node:24-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM golang:1.26.1-alpine AS backend
WORKDIR /build
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o aporia ./cmd/server/

# Stage 3: Final image
FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=backend /build/aporia .
COPY --from=backend /build/migrations/ ./migrations/
COPY --from=backend /build/api/openapi.yaml ./api/openapi.yaml
COPY --from=frontend /build/dist/ ./static/
EXPOSE 8080
CMD ["./aporia"]
