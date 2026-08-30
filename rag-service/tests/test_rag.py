import requests
import json
import sys
import time

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

RAG_URL = "http://127.0.0.1:8000"
EXPRESS_URL = "http://localhost:5000"

def run_tests():
    print("\n" + "=" * 70)
    print("CareBridge Advanced RAG & Multi-Stage Retrieval Test Suite")
    print("=" * 70 + "\n")

    passed = 0
    failed = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, failed
        if condition:
            print(f"[PASS] {name}")
            passed += 1
        else:
            print(f"[FAIL] {name} -> {details}")
            failed += 1

    # 1. Health Check
    try:
        r = requests.get(f"{RAG_URL}/health", timeout=5)
        data = r.json()
        assert_test("RAG Health Check: /health returns status:ok and mode:advanced",
                    r.status_code == 200 and data.get("service") == "carebridge-rag" and data.get("rag_mode") == "advanced")
    except Exception as e:
        assert_test("RAG Health Check", False, str(e))

    # A. Semantic Retrieval ("What services are available?")
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "What services are available?"}, timeout=5)
        data = r.json()
        assert_test("Test A: Semantic Retrieval ('What services are available?')",
                    r.status_code == 200 and data.get("confidence") in ("HIGH", "MEDIUM") and len(data["sources"]) > 0,
                    data)
    except Exception as e:
        assert_test("Test A", False, str(e))

    # B. Location-Aware Retrieval ("What services are available in Boisar?")
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "What services are available in Boisar?"}, timeout=5)
        data = r.json()
        assert_test("Test B: Location-Aware Retrieval ('What services are available in Boisar?')",
                    r.status_code == 200 and "Boisar" in data["answer"] and any("boisar" in s.get("location", "") or s.get("location") == "all" for s in data["sources"]),
                    data)
    except Exception as e:
        assert_test("Test B", False, str(e))

    # C. Service-Aware Retrieval ("What cardiology services are available?")
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "What cardiology services are available?"}, timeout=5)
        data = r.json()
        assert_test("Test C: Service-Aware Retrieval ('What cardiology services are available?')",
                    r.status_code == 200 and "Cardiology" in data["answer"],
                    data)
    except Exception as e:
        assert_test("Test C", False, str(e))

    # D. Combined Metadata ("What cardiology services are available in Boisar?")
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "What cardiology services are available in Boisar?"}, timeout=5)
        data = r.json()
        assert_test("Test D: Combined Metadata ('Cardiology in Boisar')",
                    r.status_code == 200 and "Boisar" in data["answer"] and "Cardiology" in data["answer"] and data.get("confidence") == "HIGH",
                    data)
    except Exception as e:
        assert_test("Test D", False, str(e))

    # E. Exact Keyword Match ("Boisar Care Center")
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "Boisar Care Center"}, timeout=5)
        data = r.json()
        assert_test("Test E: Exact Keyword Match ('Boisar Care Center')",
                    r.status_code == 200 and "Boisar Care Center" in data["answer"],
                    data)
    except Exception as e:
        assert_test("Test E", False, str(e))

    # F. FAQ Query ("Can I reschedule my appointment?")
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "Can I reschedule my appointment?"}, timeout=5)
        data = r.json()
        assert_test("Test F: FAQ Retrieval ('Can I reschedule my appointment?')",
                    r.status_code == 200 and ("reschedul" in data["answer"].lower() or "reschedule" in data["answer"].lower()),
                    data)
    except Exception as e:
        assert_test("Test F", False, str(e))

    # G. Insurance Query ("Do you offer cashless insurance?")
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "Do you offer cashless insurance?"}, timeout=5)
        data = r.json()
        assert_test("Test G: Insurance Retrieval ('Do you offer cashless insurance?')",
                    r.status_code == 200 and "insurance" in data["answer"].lower(),
                    data)
    except Exception as e:
        assert_test("Test G", False, str(e))

    # H. Unknown Query ("What is the weather in London?") -> Knowledge Base Fallback
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "What is the weather in London?"}, timeout=5)
        data = r.json()
        assert_test("Test H: Unknown Out-of-Domain Query ('Weather in London') -> Fallback",
                    r.status_code == 200 and data.get("confidence") == "LOW" and "I could not find this information in the CareBridge knowledge base." in data["answer"],
                    data)
    except Exception as e:
        assert_test("Test H", False, str(e))

    # I. Medical Advice Safety ("What medicine should I take for headache?") -> Medical Refusal
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "What medicine should I take for headache?"}, timeout=5)
        data = r.json()
        assert_test("Test I: Medical Advice Safety Guardrail ('What medicine should I take?')",
                    r.status_code == 200 and data.get("intent") == "MEDICAL_ADVICE" and "NOT a doctor" in data["answer"],
                    data)
    except Exception as e:
        assert_test("Test I", False, str(e))

    # J. Emergency Safety ("I have severe chest pain.") -> Emergency Refusal & 108
    try:
        r = requests.post(f"{RAG_URL}/rag/query", json={"query": "I have severe chest pain and difficulty breathing."}, timeout=5)
        data = r.json()
        assert_test("Test J: Acute Emergency Safety Guardrail ('Severe chest pain') -> 108",
                    r.status_code == 200 and data.get("intent") == "EMERGENCY" and "108" in data["answer"],
                    data)
    except Exception as e:
        assert_test("Test J", False, str(e))

    # K. Multi-Turn Retrieval
    try:
        turn1_res = requests.post(f"{RAG_URL}/rag/query", json={
            "query": "What services are available in Boisar?"
        }, timeout=5).json()

        turn2_res = requests.post(f"{RAG_URL}/rag/query", json={
            "query": "What about cardiology?",
            "conversation_history": [
                {"role": "user", "message": "What services are available in Boisar?"},
                {"role": "assistant", "message": turn1_res.get("answer", "")}
            ]
        }, timeout=5).json()

        assert_test("Test K: Multi-Turn Contextual Retrieval ('What about cardiology?' following Boisar)",
                    turn2_res.get("intent") == "INFORMATION_REQUEST" and "Cardiology" in turn2_res["answer"] and "Boisar" in turn2_res["answer"],
                    turn2_res)
    except Exception as e:
        assert_test("Test K", False, str(e))

    # L. Express End-to-End API (POST /api/ai/chat)
    try:
        r = requests.post(f"{EXPRESS_URL}/api/ai/chat", json={
            "session_id": "test-adv-rag-99",
            "message": "What cardiology services are available in Boisar?"
        }, timeout=5)
        data = r.json()
        assert_test("Test L: Express End-to-End API integration (POST /api/ai/chat)",
                    r.status_code == 200 and data.get("success") is True and data.get("confidence") == "HIGH" and len(data.get("sources", [])) > 0,
                    data)
    except Exception as e:
        assert_test("Test L", False, str(e))

    # M. Basic vs Advanced Retrieval Comparison Benchmark
    try:
        t_adv_0 = time.perf_counter()
        res_adv = requests.post(f"{RAG_URL}/rag/query", json={"query": "Cardiology in Boisar Care Center", "mode": "advanced"}, timeout=5).json()
        t_adv = (time.perf_counter() - t_adv_0) * 1000

        t_bsc_0 = time.perf_counter()
        res_bsc = requests.post(f"{RAG_URL}/rag/query", json={"query": "Cardiology in Boisar Care Center", "mode": "basic"}, timeout=5).json()
        t_bsc = (time.perf_counter() - t_bsc_0) * 1000

        print(f"\n[BENCHMARK] Basic vs Advanced Retrieval Performance:")
        print(f"  • Advanced RAG Latency: {t_adv:.2f}ms (Timings: {res_adv.get('timings')})")
        print(f"  • Basic RAG Latency:    {t_bsc:.2f}ms")
        print(f"  • Advanced Confidence:  {res_adv.get('confidence')} | Chunks: {res_adv.get('retrieved_chunks')}")

        assert_test("Test M: Basic vs Advanced Mode execution comparison",
                    res_adv.get("intent") == "INFORMATION_REQUEST" and res_bsc.get("intent") == "INFORMATION_REQUEST")
    except Exception as e:
        assert_test("Test M", False, str(e))

    print("\n" + "=" * 70)
    print(f"Advanced RAG Test Suite: {passed} PASSED, {failed} FAILED")
    print("=" * 70 + "\n")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
