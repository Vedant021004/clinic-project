#!/bin/sh

echo "=================================================="
echo "🏥 CareBridge Health Network — Initializing..."
echo "=================================================="

export DATABASE_URL=${DATABASE_URL:-"file:./dev.db"}

# 1. Setup Prisma Database and Seed Data
echo "📦 Setting up database schema..."
npx prisma generate || true
npx prisma db push --accept-data-loss || true
node prisma/seed.js || true

# 2. Start Python FastAPI RAG Microservice in background on port 8000
echo "🧠 Starting Python Advanced RAG Microservice on 127.0.0.1:8000..."
(cd /app/rag-service && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &

# Brief pause
sleep 2

# 3. Start Node.js Express Server on assigned $PORT
PORT_TO_USE=${PORT:-8080}
echo "🌐 Starting CareBridge API & Web Platform on port ${PORT_TO_USE}..."
exec node server/server.js
