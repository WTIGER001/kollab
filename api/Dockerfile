# Stage 1: Build the Go application
FROM golang:1.26-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

# Copy dependency manifests
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the Go server binary
RUN ls -la && ls -la cmd && CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server/main.go

# Stage 2: Final lightweight image
FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy the pre-built binary from the builder stage
COPY --from=builder /app/server .

# Create directory for uploads (mounted volume)
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8080

# Run the server binary
CMD ["./server"]
