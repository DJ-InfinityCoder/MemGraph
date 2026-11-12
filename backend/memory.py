"""Lexical retrieval, latest-value storage, and consolidated personal-fact memory."""
import json, math, re
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
            m = re.fullmatch(pat, sent.strip().lower())
            if m:
                g = m.groups()
                out.append(("user", rel + g[0] if rel == "favorite_" else rel, g[-1].strip()))
                break
    return out


def retractions(text):
    """Conservative explicit retractions; never interpret quoted/third-party statements."""
    facts = []
    for sentence in re.split(r"(?<=[.!?])\s+", text.strip()):
        sentence = sentence.strip().lower()
        for old, new in (("i no longer live in ", "i live in "),
                         ("i no longer work at ", "i work at "),
                         ("i no longer like ", "i like "),
                         ("i am no longer allergic to ", "i am allergic to ")):
            if sentence.startswith(old):
                facts.extend(rule_extract(new + sentence[len(old):]))
    return facts


def extract_with_report(text, model=None, api_key=None, mode="rules"):
    if mode not in ("rules", "llm"):
        raise ValueError("Extraction must be rules or llm")
    if mode == "rules":
        return rule_extract(text), {"mode": "rules", "fallback": False}
    if not model:
        raise ValueError("Set GEMINI_MODEL or pass --model for LLM extraction")
    system = ("Extract only current, affirmative personal facts asserted by the speaker. "
              "Ignore quoted speech, other people, hypotheticals, negations and historical facts. "
              "Return ONLY a JSON list of [subject, relation, object]. Subject must be user. "
              "Relations: lives_in, works_at, favorite_<thing>, allergic_to, likes.")
    raw = re.sub(r"```(?:json)?", "", llm.chat(text, system, model=model, api_key=api_key)).strip()
    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        raise ValueError("Extractor must return a JSON list")
    facts = []
    for row in parsed:
        if not isinstance(row, list) or len(row) != 3 or not all(isinstance(v, str) and v.strip() for v in row):
            raise ValueError("Invalid extracted fact")
        subject, relation, value = (v.strip().lower() for v in row)
        if subject != "user" or not (relation in REL_KEYWORDS or re.fullmatch(r"favorite_[a-z]+", relation)):
            raise ValueError("Unsupported subject or relation")
        facts.append((subject, relation, value))
    return facts, {"mode": "llm", "model": model, "fallback": False}


def extract_facts(text, model=None, api_key=None, mode="rules"):
    return extract_with_report(text, model, api_key, mode)[0]

class FlatMemory:
    name = "flat"
    def __init__(self): self.items = []
    def add(self, facts, utterance, ts): self.items.append((utterance, ts))
    def retrieve(self, query, k=3):
        return [u for u, _ in sorted(self.items, key=lambda x: -vec_sim(query, x[0]))[:k] if vec_sim(query, u) > 0]
    def graph(self): return {"nodes": [{"id": "user"}], "edges": []}

class GraphMemory:
    name = "graph"
    def __init__(self, consolidation=True, recency=True, relation_matching=True):
        self.edges = []
        self.consolidation = consolidation
        self.recency = recency
        self.relation_matching = relation_matching
    def add(self, facts, utterance, ts):
        for s, r, o in retractions(utterance):
            for edge in self.edges:
                if (edge["s"], edge["r"], edge["o"]) == (s, r, o):
                    edge["active"] = False
        for s, r, o in facts:
            same = next((e for e in self.edges if (e["s"], e["r"], e["o"]) == (s, r, o)), None)
            if self.consolidation and FUNCTIONAL(r):  # consolidation: supersede stale value
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
        rels = self._rels(query) if self.relation_matching else set()
        def score(e):
            return (2.0 if e["r"] in rels else 0.0) + vec_sim(query, f'{e["r"]} {e["o"]}') + (0.1 * e["ts"] / (1 + e["ts"]) if self.recency else 0) + 0.1 * e["count"]
        live = [e for e in self.edges if e["active"]]
        return [f'user {e["r"].replace("_", " ")} {e["o"]}' for e in sorted(live, key=lambda e: -score(e))[:k] if e["r"] in rels or vec_sim(query, f'{e["r"]} {e["o"]}') > 0]
    def graph(self):
        nodes = {"user"} | {e["o"] for e in self.edges}
        return {"nodes": [{"id": n} for n in sorted(nodes)],
                "edges": [{"source": e["s"], "target": e["o"], "label": e["r"], "active": e["active"]} for e in self.edges]}


class LatestMemory:
    """Latest-value dictionary; shares graph ranking to control retrieval differences."""
    name = "latest"

    def __init__(self):
        self.values = {}

    def add(self, facts, utterance, ts):
        for fact in retractions(utterance):
            self.values.pop(tuple(fact), None)
        for subject, relation, value in facts:
            if FUNCTIONAL(relation):
                self.values = {key: edge for key, edge in self.values.items()
                               if key[:2] != (subject, relation) or key[2] == value}
            key = (subject, relation, value)
            count = self.values.get(key, {}).get("count", 0) + 1
            self.values[key] = {"s": subject, "r": relation, "o": value, "ts": ts, "count": count, "active": True}

    def retrieve(self, query, k=3):
        ranker = GraphMemory()
        ranker.edges = list(self.values.values())
        return ranker.retrieve(query, k)
