#!/bin/sh
set -e

echo "=================================================="
echo "🏥 CareBridge Health Network — Initializing..."
echo "=================================================="

# 1. Setup Prisma Database and Seed Data
echo "📦 Initializing SQLite database with Prisma..."
npx prisma generate
npx prisma db push --skip-generate
node prisma/seed.js || true

# 2. Start Python FastAPI RAG Service on port 8000 in background
echo "🧠 Starting Python Advanced RAG Microservice on 127.0.0.1:8000..."
cd /app/rag-service && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
cd /app

# Brief pause to ensure RAG microservice is up
sleep 3

# 3. Start Node.js Express Server on assigned $PORT
echo "🌐 Starting CareBridge API & Web Platform on port ${PORT:-5000}..."
exec node server/server.js
