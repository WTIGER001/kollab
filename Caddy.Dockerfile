# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy dependency manifests
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source code and compile production assets
COPY frontend/ ./
RUN npm run build

# Stage 2: Final image serving files via Caddy
FROM caddy:latest

# Copy compiled assets from builder stage to Caddy's default directory
COPY --from=frontend-builder /app/dist /srv/dist

# Expose HTTP and HTTPS ports
EXPOSE 80 443
