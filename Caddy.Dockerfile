# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Copy dependency manifests
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code and compile production assets
COPY frontend/ ./
RUN NODE_OPTIONS=--max-old-space-size=2048 npm run build

# Stage 2: Final image serving files via Caddy
FROM caddy:latest

# Copy compiled assets from builder stage to Caddy's default directory
COPY --from=frontend-builder /app/dist /srv/dist

# Expose HTTP and HTTPS ports
EXPOSE 80 443
