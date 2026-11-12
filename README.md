# MemGraph: Graph vs Flat Agentic Memory for Long-Term Personalization

**Question:** Does a knowledge-graph memory with consolidation (new facts supersede stale ones) beat flat
vector-style retrieval at long-horizon personalization?

## Components
- `backend/llm.py`: one interface for **Gemini, OpenAI, Anthropic** (REST) plus offline `mock` mode.
- `backend/memory.py`: `FlatMemory` (baseline) vs `GraphMemory` (entities, relations, consolidation, recency, supersession).
- `backend/evaluate.py`: simulated users whose facts change across sessions; metrics: **accuracy** (current fact retrieved, no stale
  fact) and **stale rate** (outdated fact leaked into context).
- `backend/app.py`: FastAPI. `frontend/`: React UI (chat, live graph, benchmark).

## Run (no Docker)
Python 3.10+ and Node 18+. Run `./run.sh` (Mac/Linux) or `run.bat` (Windows). Open http://localhost:5173.
Pick a provider in the UI and paste a key, or copy `.env.example` to `.env`. Free Gemini key: aistudio.google.com.
CLI: `python run_eval.py --provider gemini --users 20` (writes `results.json`).

## Results (mock/rule extractor, 50 simulated users, 8 sessions, k=3)
| Memory | Accuracy | Stale rate |
|---|---|---|
| flat | 30% | 61% |
| graph | 100% | 0% |

**Caveat (be honest in interviews):** this benchmark is synthetic and templated, so graph memory has an easy win. The real
test is `--provider gemini|openai|anthropic`, where an LLM does the extraction on noisier text.

## Next steps (do these to make it research-grade)
1. Replace templated personas with LLM-generated personas and paraphrased utterances; add multi-hop questions.
2. Real embeddings (Gemini/OpenAI) for the flat baseline, so it's a fair comparison.
3. Ablate: no consolidation, no recency, no supersession. Compare extraction across providers.
4. Evaluate on LoCoMo / LongMemEval. 5. Small user study (5-10 people). 6. Write a 2-page report.

## Resume bullets (fill in your real numbers after running with an LLM)
- Built MemGraph, a knowledge-graph agentic memory system (Python/FastAPI, React) with fact consolidation and supersession, supporting Gemini, OpenAI and Anthropic backends.
- Designed a simulated-user benchmark for long-term personalization; graph memory improved current-fact accuracy from X% to Y% and cut stale-fact leakage from A% to B% versus a flat retrieval baseline.
