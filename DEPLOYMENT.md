# CareBridge Health Network — Production Deployment Guide

This document outlines the deployment architecture, container orchestration, environment configuration, and operational monitoring for CareBridge Health Network.

---

## 1. System Architecture

```
                             INTERNET / CLIENTS
                                     │
                                     ▼ (Port 5000)
                        ┌──────────────────────────┐
                        │      carebridge-api      │
                        │     (Node.js/Express)    │
                        │    - Web UI & Admin      │
                        │    - Prisma ORM / SQLite │
                        │    - Security & Auth     │
                        └────────────┬─────────────┘
                                     │
                    Internal HTTP    │ (Port 8000)
                    carebridge-net   ▼
                        ┌──────────────────────────┐
                        │      carebridge-rag      │
                        │     (Python/FastAPI)     │
                        │    - Hybrid RAG Search   │
                        │    - BM25 & Dense Vector │
                        │    - Reranker & Compress │
                        └────────────┬─────────────┘
                                     │
                                     ▼
                            [data/vector_store]
                            [LlamaCloud API]
```

---

## 2. Quick Start: Docker Compose

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)

### Step 1: Clone and Configure Environment
```bash
git clone <repository_url>
cd carebridge-health-network

# Copy environment template
cp .env.example .env
```

Edit `.env` to configure desired settings (e.g. `LLAMA_CLOUD_API_KEY`, `SALESFORCE_MODE=mock` or `live`, `ADMIN_API_KEY`).

### Step 2: Build and Launch Containers
```bash
docker compose up -d --build
```

### Step 3: Verify Service Health
```bash
# Check container status
docker compose ps

# Test Express API health
curl http://localhost:5000/health

# Test Python RAG health
curl http://localhost:8000/health
```

### Step 4: Access Applications
- **Patient Portal**: `http://localhost:5000/`
- **Admin Operations Dashboard**: `http://localhost:5000/admin`
- **RAG Microservice Docs**: `http://localhost:8000/docs`

---

## 3. Native / Bare-Metal Deployment

If running directly on a server without Docker:

### 1. Python RAG Service Setup
```bash
cd rag-service
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Node.js Backend Setup
```bash
# In project root:
npm ci
npx prisma generate
npx prisma db push
node prisma/seed.js

# Start server:
npm start
```

---

## 4. Environment Variables Reference

| Variable | Description | Default | Production Requirement |
|---|---|---|---|
| `PORT` | Express server port | `5000` | Optional |
| `NODE_ENV` | Environment mode | `production` | Required |
| `DATABASE_URL` | SQLite file connection string | `file:./dev.db` | Required |
| `RAG_SERVICE_URL` | URL of the Python RAG service | `http://localhost:8000` | Required |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated) | `http://localhost:5000` | Required |
| `ADMIN_API_KEY` | Secret token for Admin Dashboard API | — | **Critical Secret** |
| `SALESFORCE_MODE` | Mode (`mock` or `live`) | `mock` | Required |
| `SALESFORCE_LOGIN_URL` | Salesforce login gateway | `https://login.salesforce.com` | If `live` mode |
| `SALESFORCE_CLIENT_ID` | Connected App Client ID | — | If `live` mode |
| `SALESFORCE_CLIENT_SECRET` | Connected App Secret | — | If `live` mode |
| `SALESFORCE_USERNAME` | Integration User Username | — | If `live` mode |
| `SALESFORCE_PASSWORD` | Integration User Password | — | If `live` mode |
| `SALESFORCE_SECURITY_TOKEN` | Integration User Security Token | — | If `live` mode |
| `LLAMA_CLOUD_API_KEY` | LlamaCloud parsing API key | — | Optional if using cached vectors |

---

## 5. Persistent Data & Backup Strategy

The application persists data in two primary locations:

1. **SQLite Database (`dev.db`)**: Stores appointment requests, patient records, clinic mappings, and Salesforce synchronization status.
2. **Vector Store (`data/vector_store/carebridge_vectors.json`)**: Stores parsed and embedded semantic chunks.

### Automated Backup Command
```bash
# Backup database and vector store
mkdir -p backups
cp dev.db backups/dev_$(date +%Y%m%d_%H%M%S).db
cp -r data/ backups/data_$(date +%Y%m%d_%H%M%S)/
```

---

## 6. Observability & Log Monitoring

```bash
# Follow logs in real-time
docker compose logs -f

# Follow API service only
docker compose logs -f carebridge-api

# Follow RAG service only
docker compose logs -f carebridge-rag
```
