# ==============================================================================
# WorkElate AI — Unified Production Multi-Stage Dockerfile
# Stage 1: Build Frontend (Vite + React + Tailwind)
# Stage 2: Production Python Backend (FastAPI + Standalone Crawler CLI)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend
# ------------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Final Production Runner
# ------------------------------------------------------------------------------
FROM python:3.13-slim AS runner

# Install system dependencies (curl for healthchecks, build essentials)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend assets from Stage 1 into frontend/dist
COPY --from=frontend-builder /build/dist ./frontend/dist

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    ENVIRONMENT=production \
    PYTHONPATH=/app/backend \
    DATABASE_URL=sqlite+aiosqlite:///./workelate.db

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start FastAPI server
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --app-dir /app/backend
