# ==========================================
# CareBridge Health Network — Production Dockerfile
# Multi-runtime (Node.js 20 + Python 3.11) for seamless 1-click Railway Deployment
# ==========================================

FROM python:3.11-slim

# Install system dependencies, curl, and Node.js 20
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install Python RAG dependencies
COPY rag-service/requirements.txt ./rag-service/
RUN pip install --no-cache-dir -r rag-service/requirements.txt

# 2. Install Node.js dependencies & Prisma Client
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate

# 3. Copy application codebase
COPY . .

# 4. Make startup script executable
RUN chmod +x start.sh

# Environment Defaults for Railway
ENV NODE_ENV=production
ENV PORT=5000
ENV RAG_SERVICE_URL=http://127.0.0.1:8000
ENV DATABASE_URL="file:/app/dev.db"
ENV PYTHONPATH=/app/rag-service

# Expose Web & API Port
EXPOSE 5000 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Launch unified startup script
CMD ["./start.sh"]
