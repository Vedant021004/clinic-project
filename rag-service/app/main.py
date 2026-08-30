import sys

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.config import settings
from app.ingestion.indexer import get_vector_store

app = FastAPI(
    title="CareBridge Healthcare RAG Service",
    description="Document ingestion and semantic RAG retrieval service for CareBridge Health Network",
    version="1.0.0"
)

# CORS middleware for internal Node.js backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

@app.on_event("startup")
def startup_event():
    print(f"CareBridge RAG Service starting on port {settings.RAG_SERVICE_PORT}...")
    vector_store = get_vector_store()
    print(f"Ready with {len(vector_store.records)} indexed chunks.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.RAG_SERVICE_PORT)
