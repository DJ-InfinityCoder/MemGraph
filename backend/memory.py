"""Two memories: FlatMemory (vector baseline) vs GraphMemory (knowledge graph + consolidation)."""
import json, math, os, re
from collections import Counter
from . import llm

STOP = set("i my me the a an is are was do does did what where which who these days now currently of to in at and it that this".split())
FUNCTIONAL = lambda rel: rel in ("lives_in", "works_at") or rel.startswith("favorite_")
REL_KEYWORDS = {"lives_in": ["live", "city", "home", "reside", "moved"], "works_at": ["work", "job", "company", "employer"],
                "allergic_to": ["allerg"], "likes": ["like", "enjoy", "love", "hobby"]}
PATTERNS = [(r"i (?:recently )?(?:live in|moved to|relocated to) ([\w ]+?)[.!,]?$", "lives_in"),
            (r"i (?:work at|joined|switched jobs to) ([\w ]+?)[.!,]?$", "works_at"),
            (r"my favou?rite (\w+) is ([\w ]+?)[.!,]?$", "favorite_"),
            (r"i am allergic to ([\w ]+?)[.!,]?$", "allergic_to"),
            (r"i (?:like|love|enjoy) ([\w ]+?)[.!,]?$", "likes")]

def toks(t):
    return [w[:-1] if w.endswith("s") and len(w) > 3 else w for w in re.findall(r"[a-z]+", t.lower()) if w not in STOP]

def vec_sim(a, b):
    ca, cb = Counter(toks(a)), Counter(toks(b))
    dot = sum(ca[w] * cb[w] for w in ca)
    na, nb = math.sqrt(sum(v * v for v in ca.values())), math.sqrt(sum(v * v for v in cb.values()))
    return dot / (na * nb) if na and nb else 0.0

def rule_extract(text):
    out = []
    for sent in re.split(r"(?<=[.!?])\s+", text.strip()):
        for pat, rel in PATTERNS:
            m = re.search(pat, sent.strip().lower())
            if m:
                g = m.groups()
                out.append(("user", rel + g[0] if rel == "favorite_" else rel, g[-1].strip()))
                break
    return out

def extract_facts(text, model="gemini-3.8-flash", api_key=None):
    """Gemini 3.8 Flash extraction of (subject, relation, object); falls back to rules if offline."""
    if os.getenv("GEMINI_API_KEY") or api_key:
        sys = ("Extract personal facts about the user as JSON list of [subject, relation, object]. Use relations: "
               "lives_in, works_at, favorite_<thing>, allergic_to, likes. Subject is 'user'. Return ONLY JSON.")
        try:
            raw = llm.chat(text, sys, model=model, api_key=api_key)
            raw = re.sub(r"```(?:json)?", "", raw).strip()
            return [(s.lower(), r.lower(), str(o).lower()) for s, r, o in json.loads(raw)]
        except Exception:
            pass
    return rule_extract(text)

class FlatMemory:
    name = "flat"
    def __init__(self): self.items = []
    def add(self, facts, utterance, ts): self.items.append((utterance, ts))
    def retrieve(self, query, k=3):
        return [u for u, _ in sorted(self.items, key=lambda x: -vec_sim(query, x[0]))[:k] if vec_sim(query, u) > 0]
    def graph(self): return {"nodes": [{"id": "user"}], "edges": []}

class GraphMemory:
    name = "graph"
    def __init__(self): self.edges = []  # dict(s, r, o, ts, active, count)
    def add(self, facts, utterance, ts):
        for s, r, o in facts:
            same = next((e for e in self.edges if (e["s"], e["r"], e["o"]) == (s, r, o)), None)
            if FUNCTIONAL(r):  # consolidation: supersede stale value
                for e in self.edges:
                    if e["s"] == s and e["r"] == r and e["o"] != o:
                        e["active"] = False
            if same:  # consolidation: reinforce duplicate
                same["count"] += 1; same["ts"] = ts; same["active"] = True; continue
            self.edges.append({"s": s, "r": r, "o": o, "ts": ts, "active": True, "count": 1})
    def _rels(self, query):
        q = query.lower(); rels = set()
        for r, kws in REL_KEYWORDS.items():
            if any(k in q for k in kws): rels.add(r)
        for m in re.findall(r"favou?rite (\w+)", q): rels.add("favorite_" + m)
        return rels
    def retrieve(self, query, k=3):
        rels = self._rels(query)
        def score(e):
            return (2.0 if e["r"] in rels else 0.0) + vec_sim(query, f'{e["r"]} {e["o"]}') + 0.01 * e["ts"] + 0.1 * e["count"]
        live = [e for e in self.edges if e["active"]]
        return [f'user {e["r"].replace("_", " ")} {e["o"]}' for e in sorted(live, key=lambda e: -score(e))[:k] if score(e) >= 1.0]
    def graph(self):
        nodes = {"user"} | {e["o"] for e in self.edges}
        return {"nodes": [{"id": n} for n in nodes],
                "edges": [{"source": e["s"], "target": e["o"], "label": e["r"], "active": e["active"]} for e in self.edges]}
