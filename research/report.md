# MemGraph preliminary retrieval experiment

## Question and mechanism

Does superseding outdated personal facts reduce stale retrieved context? Does retaining graph history outperform a latest-value dictionary under matched extraction and ranking?

## Method

Run: `python run_eval.py --users 50 --sessions 8 --k 3 --seed 0`.

50 seeded synthetic personas, four attributes per user, 8 sessions, 200 final-state queries. Each utterance is extracted once with deterministic rules and shared across methods. Retrieval is capped at 3 items and 80 words. Latest-value and graph memory share ranking; only graph memory retains inactive history. Lexical retrieval operates on raw turns. Eight additional hand-authored diagnostics cover retractions, attribution, historical statements, hypotheticals, unknown facts and an unfamiliar paraphrase.

## Observed results

| Method | Current-fact retrieval accuracy | Stale-context rate |
|---|---:|---:|
| Lexical retrieval | 30.0% | 61.0% |
| Latest-value dictionary | 100.0% | 0.0% |
| Graph memory | 100.0% | 0.0% |
| Graph without supersession | 27.5% | 72.5% |
| Graph without recency | 100.0% | 0.0% |
| Graph without relation matching | 100.0% | 0.0% |

Graph memory and latest-value storage both pass 7/8 diagnostics. Both miss "Delhi is my new home" because the rule extractor does not recognize it. The lexical baseline passes 1/8. These diagnostics were authored during development and are not held-out evidence.

## Interpretation

Supersession matters on this synthetic task. The experiment supplies no evidence that retained graph history improves current-fact retrieval over a latest-value dictionary. Recency and relation matching also show no measurable gain here. The lexical baseline has different representation and retrieval rules; the graph-versus-lexical gap cannot isolate a graph-structure effect.

## Limits and next experiments

This experiment uses templates that match the rules, evaluates only four final attributes and checks value strings in context. It does not evaluate generated responses, multi-hop reasoning, real-user utility, or generalization. Descriptive query intervals ignore clustering by user. No live Gemini result or user-study outcome is reported.

Next: add semantic embedding retrieval, expand independently labeled conversations and temporal questions, evaluate generated-answer correctness and refusal on unknown facts, measure latency and cost, and conduct the proposed memory-control pilot. Real external datasets and a completed study are required before making broader research claims.
