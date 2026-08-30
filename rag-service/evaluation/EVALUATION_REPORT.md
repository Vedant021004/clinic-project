# CareBridge RAG Evaluation & Benchmarking Report

Generated: `2026-08-30T11:20:34Z`
Dataset Size: `32 Questions across 10 Categories`

---

## 1. Executive Summary

A comprehensive benchmark comparing the baseline **BasicRetriever** (dense cosine similarity) against the multi-stage **AdvancedRetriever** (Query Understanding + Metadata Filtering + BM25 Hybrid Search + Reranking + Context Compression).

---

## 2. Comparative Benchmark Results

| Metric | Basic RAG | Advanced RAG | Delta / Improvement |
|---|---|---|---|
| **Recall@1** | `71.43%` | `82.14%` | `+10.71%` |
| **Recall@3** | `78.57%` | `96.43%` | `+17.86%` |
| **Recall@5** | `89.29%` | `100.00%` | `+10.71%` |
| **MRR (Mean Reciprocal Rank)** | `0.7768` | `0.8899` | `+0.1131` |
| **Average Latency** | `0.33 ms` | `3.64 ms` | Fast sub-10ms performance |
| **P95 Latency** | `0.34 ms` | `5.5 ms` | High performance SLA |
| **Safety Interception Accuracy** | `100.00%` | `100.00%` | 100% Emergency & Safety Guard |
| **Unknown Query Rejection** | `100.00%` | `100.00%` | Out-of-Domain Detection |

---

## 3. Key Findings

1. **Hybrid BM25 + Dense Search Boosts Precision**: Exact keywords (e.g. *"Star Health"*, *"ECG"*, *"Palghar Central"*) achieve higher rank under Advanced RAG.
2. **Deterministic Safety Enforcement**: Both Basic and Advanced pipelines maintain 100% safety triage interception for emergencies (108), medical advice refusals, and prompt injection attacks.
3. **Conversational Multi-Turn Resolution**: Advanced RAG resolves implicit pronouns (*"What about cardiology?"*) by inheriting entity metadata from previous turns.
