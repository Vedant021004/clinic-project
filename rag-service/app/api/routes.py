from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.pipeline.rag_pipeline import CareBridgeRAGPipeline

router = APIRouter()
pipeline = CareBridgeRAGPipeline()

class HistoryItem(BaseModel):
    role: Optional[str] = "user"
    message: str

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User question for the CareBridge knowledge base")
    conversation_history: Optional[List[HistoryItem]] = Field(default=None, description="Optional previous conversational turns")
    mode: Optional[str] = Field(default=None, description="Retrieval mode: 'advanced' or 'basic'")

class SourceAttribution(BaseModel):
    document: str
    section: Optional[str] = "General Information"
    location: Optional[str] = "general"

class QueryResponse(BaseModel):
    answer: str
    intent: str = "INFORMATION_REQUEST"
    confidence: str = "HIGH"
    sources: List[SourceAttribution]
    retrieved_chunks: int
    timings: Optional[Dict[str, float]] = None

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "carebridge-rag",
        "rag_mode": "advanced"
    }

@router.post("/rag/query", response_model=QueryResponse)
def query_rag(request: QueryRequest):
    try:
        history_list = None
        if request.conversation_history:
            history_list = [{"role": h.role, "message": h.message} for h in request.conversation_history]

        result = pipeline.execute(
            query=request.query,
            conversation_history=history_list,
            mode=request.mode
        )

        return QueryResponse(
            answer=result["answer"],
            intent=result.get("intent", "INFORMATION_REQUEST"),
            confidence=result.get("confidence", "HIGH"),
            sources=[SourceAttribution(**s) for s in result.get("sources", [])],
            retrieved_chunks=result.get("retrieved_chunks", 0),
            timings=result.get("timings")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
