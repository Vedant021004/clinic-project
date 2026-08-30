# CareBridge Healthcare RAG & Document Ingestion Service

This service provides a production-style, document-based Retrieval-Augmented Generation (RAG) knowledge retrieval system for **CareBridge Health Network**. It replaces static FAQ lookups with dynamic semantic document ingestion, parsing, chunking, dense vector indexing, and grounded answer retrieval.

---

## 1. Verified SDK Packages and Versions

During initial inspection and dependency verification, the official unified LlamaCloud & LlamaIndex SDK packages were installed and verified:

- **`llama-cloud`**: `0.1.46` — Official unified LlamaCloud client (`from llama_cloud.client import LlamaCloud`).
- **`llama-parse`**: `0.6.94` — Cloud document parsing engine (`from llama_parse import LlamaParse` / `from llama_cloud_services import LlamaParse`).
- **`llama-index-core`**: `0.14.24` — Core indexing abstractions and vector workflows.
- **`fastapi`**: `0.141.1` & **`uvicorn`**: `0.52.4` — High-performance asynchronous REST microservice.
- **`sentence-transformers`**: `6.0.0` & **`numpy`**: `2.5.2` — Dense vector representations.
- **`python-dotenv`**: `1.2.3` — Environment variable loading.

---

## 2. Advanced Multi-Stage RAG Architecture

```
User Query (or Conversational Turn)
       │
       ▼ [1. Intent Classifier] (Emergency / Medical Advice / Booking / Info)
Intent + Query
       │
       ▼ [2. Query Processor] (Entity Extraction: Location, Service, Patient Type)
Processed Query + Extracted Entities
       │
       ▼ [3. Hybrid Retrieval]
┌────────────────────────┴────────────────────────┐
▼ [Dense Vector Cosine (w=0.7)]                   ▼ [BM25 Keyword Matching (w=0.3)]
Dense Candidates                                  Exact Keyword Matches
└────────────────────────┬────────────────────────┘
                         │
                         ▼ [4. Candidate Fusion & Deduplication]
Unified Candidates List with Combined Scores
                         │
                         ▼ [5. Metadata Soft Filtering] (Location/Service constraints + Broad Fallback)
Filtered Candidates
                         │
                         ▼ [6. Feature Reranker] (Query Density, Section Match, Metadata Boost)
Top-5 Reranked Candidates
                         │
                         ▼ [7. Context Compressor] (Sentence Deduplication & Evidence Formatting)
High-Density Factual Context
                         │
                         ▼ [8. Grounded Generation & Anti-Hallucination Guard]
Grounded Answer + Structured Sources (document, section, location) + Confidence
```

---

## 3. Retrieval Components (`rag-service/app/retrieval/`)

1. **`intent.py` (`IntentClassifier`)**: Categorizes queries into `EMERGENCY`, `MEDICAL_ADVICE`, `APPOINTMENT_REQUEST`, `EXISTING_PATIENT_SUPPORT`, or `INFORMATION_REQUEST`.
2. **`query_processor.py` (`QueryProcessor`)**: Extracts structured entities (`location`, `service`, `patient_type`) and contextualizes multi-turn conversations.
3. **`metadata_filter.py` (`MetadataFilter`)**: Applies metadata-aware filtering (e.g. `location=boisar`) with automatic fallback to broad retrieval if candidates are sparse.
4. **`semantic_search.py` (`SemanticSearch`)**: Dense vector cosine similarity search.
5. **`keyword_search.py` (`KeywordSearch`)**: BM25-style keyword search with stopword filtering for exact phrase and term precision.
6. **`hybrid_search.py` (`HybridSearch`)**: Reciprocal/linear score fusion combining semantic and keyword channels (`SEMANTIC_WEIGHT=0.7`, `KEYWORD_WEIGHT=0.3`).
7. **`reranker.py` (`Reranker`)**: Lightweight local cross-feature reranker scoring term density, section alignment, and metadata boosts.
8. **`context_compressor.py` (`ContextCompressor`)**: Deduplicates redundant sentences across chunks and compiles high-density evidence blocks.
9. **`retriever.py`**: Exports both `AdvancedRetriever` and `BasicRetriever` side-by-side (`RAG_MODE=advanced` vs `basic`).

---

## 3. How the Pipeline Works

### 1. Document Parsing
- Documents in `data/knowledge/` are parsed using `LlamaParse` when `LLAMA_CLOUD_API_KEY` is provided.
- If running offline or without an API key, the built-in structural parser normalizes markdown whitespace, tables, lists, and section headers.

### 2. Semantic Chunking (`app/ingestion/chunker.py`)
- Rather than arbitrary character slicing, documents are segmented into logical sections based on markdown heading hierarchies (`#`, `##`, `###`) and Q&A blocks.
- Each chunk retains its immediate context, title, and section headers so it is understandable independently.

### 3. Metadata Tagging (`app/ingestion/metadata.py`)
- Chunks are enriched with structured metadata:
  ```json
  {
    "document": "services.md",
    "document_type": "service",
    "location": "boisar",
    "service": "cardiology",
    "section": "2. Cardiology"
  }
  ```

### 4. Embedding Generation (`app/ingestion/embeddings.py`)
- Configurable via `EMBEDDING_PROVIDER` in settings (`semantic_dense` or `sentence_transformers`).
- Generates 384-dimensional dense vectors with subword and keyword semantic projections.

### 5. Salesforce CRM Integration

CareBridge Health Network synchronizes appointment requests with Salesforce CRM while maintaining SQLite/Prisma as the authoritative source of truth.

```
CareBridge Appointment Request
              │
              ▼
   [Local Database (Prisma)] ──► Status: PENDING, Request ID: CB-XXXXXX
              │
              ▼
    [Lead Temperature Calc] ──► HOT / WARM / COLD
              │
              ▼
   [Salesforce Lead Created] ──► FirstName, LastName, Email, Phone, Company, LeadSource, Description
              │
              ▼
   [Salesforce Task Created] ──► WhoId: LeadId, Subject: CB-XXXXXX, Priority: High/Normal/Low
              │
              ▼
     [Sync Status Updated] ──► SYNCED (salesforceLeadId, salesforceTaskId, salesforceSyncedAt)
```

---

## 6. Admin Operations Dashboard (`/admin`)

The internal healthcare operations dashboard provides clinic administrators and staff with real-time triage and CRM tracking:

- **Live Database KPIs**: Total Requests, Pending Triage, Confirmed Appointments, Lead Temperature breakdowns (Hot/Warm/Cold), and Salesforce sync health.
- **Server-Side Search & Multi-Filters**: Filter by Clinic Location, Medical Service, Patient Type, Status, Temperature, Salesforce Sync Status, and Preferred Date.
- **Server-Side Pagination**: Efficient `page` & `limit` query execution over SQLite records.
- **Detailed Patient & Appointment Modal**: Full contact profile, scheduling specs, sanitized conversational intake log, and direct staff action controls (Confirm, Reschedule, Cancel, Complete).
- **Salesforce CRM Control**: Inspect `Lead ID`, `Task ID`, sync errors, and trigger on-demand retry via `POST /api/admin/appointments/:requestId/salesforce-retry`.
- **Clinic & Service Analytics**: Aggregated demand breakdown across Palghar Central, Boisar, Vasai, and Nalasopara care centers.
- **Secure Authentication**: Protected under `x-admin-key` header / Bearer token via `ADMIN_API_KEY`.

### Modes of Operation
- **Development (`SALESFORCE_MODE=mock`)**: Simulates Salesforce OAuth2 and REST responses (`00Q...` Lead ID, `00T...` Task ID) without external network calls.
- **Production (`SALESFORCE_MODE=live`)**: Authenticates via Salesforce OAuth2 Password/Client Credentials flow against `SALESFORCE_LOGIN_URL` and creates real SObjects.

### Endpoints
- `GET /api/integrations/salesforce/status/:requestId` — Returns sync status, Lead ID, and Task ID.
- `POST /api/integrations/salesforce/retry/:requestId` — Idempotently retries failed synchronizations without creating duplicate Leads.

### Failure Isolation & Security
- If Salesforce synchronization fails, the local appointment request remains `PENDING` with sync status `FAILED`. The patient receives their `CB-XXXXXX` receipt without disruption.
- Strict PHI Sanitization: No medical records, diagnoses, symptoms, or prescriptions are sent to Salesforce CRM. Only operational scheduling metadata is included.

---

## 4. How to Add a New Knowledge Document

1. Create a new markdown file in `data/knowledge/`, for example:
   `data/knowledge/specialist_doctors.md`
2. Run the ingestion script:
   ```bash
   python rag-service/scripts/ingest.py
   ```
3. The ingestion pipeline will discover the new file, parse, chunk, embed, and index it into the vector store.

---

## 5. Environment Variables (`rag-service/.env`)

```env
LLAMA_CLOUD_API_KEY=your_key_here
LLAMA_CLOUD_API_URL=https://api.cloud.llamaindex.ai
EMBEDDING_PROVIDER=semantic_dense
EMBEDDING_MODEL=all-MiniLM-L6-v2
VECTOR_DATABASE_PATH=../data/vector_store/carebridge_vectors.json
RAG_SERVICE_PORT=8000
DEBUG_MODE=true
TOP_K=5
```

---

## 6. How to Run

### Run Ingestion
```bash
python rag-service/scripts/ingest.py
```

### Start RAG Microservice (Port 8000)
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir rag-service
```

### Run Automated RAG Test Suite
```bash
python rag-service/tests/test_rag.py
```

---

## 7. Example API Usage

### Health Check
```http
GET /health HTTP/1.1
Host: 127.0.0.1:8000
```
**Response:**
```json
{
  "status": "ok",
  "service": "carebridge-rag"
}
```

### Query Endpoint
```http
POST /rag/query HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json

{
  "query": "What cardiology services are available in Boisar?"
}
```
**Response:**
```json
{
  "answer": "Yes, **Boisar Care Center** offers Cardiology consultations and cardiac diagnostics, including ECG evaluations, hypertension monitoring, and preventive cardiovascular screening.",
  "sources": [
    {
      "document": "services.md",
      "location": "boisar"
    },
    {
      "document": "locations.md",
      "location": "boisar"
    }
  ],
  "retrieved_chunks": 5,
  "intent": "INFORMATION_REQUEST"
}
```
