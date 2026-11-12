# MemGraph: Inspectable Personal Memory

A research prototype asking: **when a person's facts change, which memory mechanisms reduce stale retrieved context?** Python/FastAPI, SQLite, React and Vite. Gemini is optional; the demo and benchmark work offline.

## Implemented

- Lexical baseline: bag-of-words cosine retrieval of original messages, not semantic embeddings.
- Latest-value dictionary: current functional facts, sharing extraction and ranking with graph memory.
- Graph memory: triples, supersession, duplicate reinforcement, recency, and inactive historical edges. The graph is reconstructed from SQLite events; this is not a graph database or multi-hop GraphRAG engine.
- Ablations: no supersession, no recency, no relation matching.
- Memory inspection, corrections through chat, explicit retractions, and Forget controls.
- SQLite persistence scoped to a random HTTP-only browser-session cookie. Reset clears only that session.
- Explicit extraction and generation status. LLM extraction errors fail visibly rather than silently falling back to rules.

## Run

Requires Python 3.10+ and Node.js 18+.

Windows PowerShell:

```powershell
.\run.ps1
```

In a second terminal:

```powershell
cd frontend
npm run dev
```

macOS/Linux: `bash run.sh` starts both processes. Open http://localhost:5173. Backend: http://localhost:8000.

Manual setup: create a virtual environment, install `backend/requirements.txt`, install frontend packages with `npm install`, then run `python -m uvicorn backend.app:app --reload --port 8000` and the frontend dev server in separate terminals.

Copy `.env.example` to `.env` only if needed. Default extraction is `MEMGRAPH_EXTRACTION=rules`. Set `GEMINI_API_KEY` and `GEMINI_MODEL` to an available model in your account for live responses. Set `MEMGRAPH_EXTRACTION=llm` for LLM extraction in chat. The benchmark selects its extraction mode explicitly. Only Gemini is integrated.

Try: "I live in Pune." -> "I moved to Delhi." -> "Where do I live?" -> "I no longer live in Delhi."

## Evaluation

```powershell
python run_eval.py --users 50 --sessions 8 --k 3 --seed 0
python run_eval.py --extraction llm --model YOUR_MODEL --users 5 --output results-llm.json
python -m unittest discover -s tests -v
```

The CLI writes results only after successful completion. LLM runs make external API calls and require credentials. Each utterance is extracted once and shared across methods. All methods receive the same top-k limit and maximum context-word budget (`--max-context-words`, default 80).

The default experiment uses 50 synthetic users, 8 sessions and four changing personal attributes. **Current-fact retrieval accuracy** means context contains the current value and no outdated value. Stale rate measures outdated values in context. Context length is words, not model tokens. Neither metric measures generated-answer quality.

`results.json` contains counts, descriptive Wilson intervals, configuration, extraction counts, ablations, failure examples and a separate eight-case language diagnostic. Query-level intervals ignore within-user dependence and do not establish population-level significance. The hand-authored diagnostics include an intentionally unsupported paraphrase to expose rule limits.

See [research/report.md](research/report.md) for results and [research/user-study.md](research/user-study.md) for a proposed pilot. No completed user study or external benchmark result is claimed.

## Memory controls and limits

Corrections supersede city, employer and favorite values. Likes and allergies support multiple values. Retractions support "I no longer live in ...", "I no longer work at ...", "I no longer like ...", and "I am no longer allergic to ...". Rules cover narrow first-person templates, not arbitrary language, temporal reasoning or entity resolution.

Forget deletes source turns, including other facts in those turns. For single-valued relations it clears the relation's source history to prevent old values returning. Reset deletes the session's event records. Backup deletion and forensic erasure are outside the prototype's scope.

The cookie is a local browser-session boundary, not account authentication. People sharing a browser profile share memory. Clearing cookies loses access to a session; its rows remain until removed. The database is local and unencrypted. Use synthetic data for demos. Public deployment requires authentication, TLS, retention controls, request limits and backup policies. Evaluation is synchronous; LLM runs can take time.

Semantic embedding retrieval, external datasets, multi-hop retrieval, generated-answer evaluation and a completed user study remain future work.

## Accurate application description

Built an interactive personal-memory research prototype with persistent session-scoped storage, fact supersession, inspectable memory and deletion controls; evaluated lexical retrieval, a latest-value baseline and memory ablations on synthetic conversations, documenting limitations and failure cases.
