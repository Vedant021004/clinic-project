# ==========================================
# CareBridge Health Network — Express API Dockerfile
# ==========================================

FROM node:20-alpine AS base

# Install OpenSSL for Prisma Client on Alpine
RUN apk add --no-cache openssl curl

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Copy application source
COPY server ./server/
COPY public ./public/
COPY data ./data/

# Default Environment
ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL="file:/app/dev.db"

# Expose API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start server
CMD ["node", "server/server.js"]
