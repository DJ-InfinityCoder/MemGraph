"""Simulated-user benchmark: facts evolve across sessions; measure current-fact recall and stale-fact leakage."""
import random
from .memory import FlatMemory, GraphMemory, LatestMemory, extract_with_report
import re
import math
import json
from pathlib import Path
from collections import Counter

POOL = {"lives_in": ["pune", "delhi", "mumbai", "chennai", "hyderabad", "kolkata"],
        "works_at": ["infosys", "flipkart", "zomato", "swiggy", "razorpay", "google"],
        "favorite_food": ["biryani", "pizza", "dosa", "sushi", "pasta"],
        "favorite_sport": ["cricket", "tennis", "football", "chess"]}
SAY = {"lives_in": ["I live in {}.", "I recently moved to {}."], "works_at": ["I work at {}.", "I joined {}."],
       "favorite_food": ["My favorite food is {}."], "favorite_sport": ["My favorite sport is {}."]}
ASK = {"lives_in": "Where do I live these days?", "works_at": "Which company do I work at now?",
       "favorite_food": "What is my favorite food?", "favorite_sport": "What is my favorite sport?"}
FILLER = ["The weather has been odd lately.", "Can you help me plan my week?", "I watched a good movie yesterday.", "Traffic was terrible today."]

def make_persona(seed, n_sessions=8):
    rng = random.Random(seed)
    truth = {r: rng.choice(v) for r, v in POOL.items()}
    history = {r: [truth[r]] for r in truth}
    sessions = [[rng.choice(SAY[r]).format(v) for r, v in truth.items()]]
    for _ in range(n_sessions - 1):
        turns = [rng.choice(FILLER) for _ in range(2)]
        if rng.random() < 0.7:
            r = rng.choice(list(POOL)); new = rng.choice([x for x in POOL[r] if x != truth[r]])
            truth[r] = new; history[r].append(new); turns.append(rng.choice(SAY[r]).format(new))
        sessions.append(turns)
    return sessions, truth, history

def contains_value(context, value):
    return bool(re.search(r"(?<!\w)" + re.escape(value) + r"(?!\w)", context))


def interval(successes, total):
    """Wilson interval for descriptive query-level proportions (queries are clustered by user)."""
    z = 1.96
    p = successes / total
    denominator = 1 + z*z / total
    center = (p + z*z / (2*total)) / denominator
    margin = z * math.sqrt(p*(1-p)/total + z*z/(4*total*total)) / denominator
    return [round(max(0, center-margin), 4), round(min(1, center+margin), 4)]


def run_eval(n_users=20, n_sessions=8, k=3, model=None, api_key=None,
             extraction="rules", ablations=True, max_context_words=80, seed=0):
    if not (1 <= n_users <= 100 and 1 <= n_sessions <= 50 and 1 <= k <= 20 and 1 <= max_context_words <= 1000):
        raise ValueError("Expected users 1..100, sessions 1..50, k 1..20, context words 1..1000")
    factories = {"flat": FlatMemory, "latest": LatestMemory, "graph": GraphMemory}
    if ablations:
        factories.update({
            "graph_no_supersession": lambda: GraphMemory(consolidation=False),
            "graph_no_recency": lambda: GraphMemory(recency=False),
            "graph_no_relation_matching": lambda: GraphMemory(relation_matching=False),
        })
    stats = {name: {"correct": 0, "stale": 0, "total": 0, "ctx": 0} for name in factories}
    modes = Counter()
    failures = []
    for user_seed in range(seed, seed + n_users):
        sessions, truth, history = make_persona(user_seed, n_sessions)
        # Extract once per utterance; every method sees identical extracted facts.
        events = []
        for session in sessions:
            for utterance in session:
                facts, report = extract_with_report(utterance, model=model, api_key=api_key, mode=extraction)
                modes[report["mode"]] += 1
                events.append((utterance, facts))
        for name, factory in factories.items():
            memory = factory()
            for timestamp, (utterance, facts) in enumerate(events, 1):
                memory.add(facts, utterance, timestamp)
            for relation, answer in truth.items():
                context = " ".join(memory.retrieve(ASK[relation], k)).lower()
                context = " ".join(context.split()[:max_context_words])
                result = stats[name]
                result["total"] += 1
                result["ctx"] += len(context.split())
                hit = contains_value(context, answer)
                stale = any(contains_value(context, old) for old in history[relation] if old != answer)
                result["correct"] += bool(hit and not stale)
                result["stale"] += bool(stale)
                if not hit or stale:
                    if len(failures) < 30:
                        failures.append({"user_seed": user_seed, "memory": name, "query": ASK[relation],
                                         "expected": answer, "context": context, "stale": stale})
    results = {}
    for name, result in stats.items():
        accuracy = round(result["correct"] / result["total"], 3)
        results[name] = {
            "accuracy": accuracy,  # compatibility for existing clients
            "current_fact_retrieval_accuracy": accuracy,
            "stale_rate": round(result["stale"] / result["total"], 3),
            "avg_context_words": round(result["ctx"] / result["total"], 1),
            "queries": result["total"], "correct": result["correct"],
            "accuracy_interval_95_descriptive": interval(result["correct"], result["total"]),
        }
    results["config"] = {"users": n_users, "sessions": n_sessions, "k": k, "model": model if extraction == "llm" else None,
                         "extraction": extraction, "extraction_counts": dict(modes), "fallback_count": 0,
                         "seed": seed, "max_context_words": max_context_words,
                         "metric": "retrieved context contains current value and no stale value",
                         "limitation": "Templated synthetic data; retrieval only, not generated answer quality. Query intervals ignore within-user dependence."}
    results["challenge_suite"] = run_challenges(factories, model, api_key, extraction, k, max_context_words)
    results["failures"] = failures
    return results


def run_challenges(factories, model=None, api_key=None, extraction="rules", k=3, max_context_words=80):
    """Small hand-authored diagnostic set, not a generalization benchmark."""
    cases = json.loads((Path(__file__).resolve().parents[1] / "research" / "challenges.json").read_text())
    results = {name: {"passed": 0, "total": len(cases), "cases": []} for name in factories}
    extraction_calls = 0
    for case in cases:
        events = []
        for utterance in case["turns"]:
            facts, _ = extract_with_report(utterance, model=model, api_key=api_key, mode=extraction)
            extraction_calls += 1
            events.append((utterance, facts))
        for name, factory in factories.items():
            memory = factory()
            for timestamp, (utterance, facts) in enumerate(events, 1):
                memory.add(facts, utterance, timestamp)
            context = " ".join(" ".join(memory.retrieve(case["query"], k)).lower().split()[:max_context_words])
            hit = contains_value(context, case["expected"]) if case["expected"] else not context
            stale = any(contains_value(context, old) for old in case["stale"])
            passed = bool(hit and not stale)
            results[name]["passed"] += passed
            results[name]["cases"].append({"name": case["name"], "passed": passed, "context": context,
                                           "expected": case["expected"]})
    return {"description": "Hand-authored diagnostics, including an unsupported paraphrase; not held-out research evidence.",
            "extraction_calls": extraction_calls, "methods": results}
