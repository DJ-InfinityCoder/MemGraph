"""Simulated-user benchmark: facts evolve across sessions; measure current-fact recall and stale-fact leakage."""
import random
from .memory import FlatMemory, GraphMemory, extract_facts

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

def run_eval(n_users=20, n_sessions=8, k=3, provider="mock", model=None, api_key=None):
    stats = {m: {"correct": 0, "stale": 0, "total": 0, "ctx": 0} for m in ("flat", "graph")}
    for seed in range(n_users):
        sessions, truth, history = make_persona(seed, n_sessions)
        for mem in (FlatMemory(), GraphMemory()):
            t = 0
            for sess in sessions:
                for utt in sess:
                    t += 1; mem.add(extract_facts(utt, provider, model, api_key), utt, t)
            for rel, ans in truth.items():
                ctx = " ".join(mem.retrieve(ASK[rel], k)).lower()
                s = stats[mem.name]; s["total"] += 1; s["ctx"] += len(ctx.split())
                hit = ans in ctx; stale = any(o in ctx for o in history[rel] if o != ans)
                s["correct"] += hit and not stale; s["stale"] += stale
    return {m: {"accuracy": round(s["correct"] / s["total"], 3), "stale_rate": round(s["stale"] / s["total"], 3),
                "avg_context_words": round(s["ctx"] / s["total"], 1)} for m, s in stats.items()} | \
           {"config": {"users": n_users, "sessions": n_sessions, "k": k, "provider": provider}}
