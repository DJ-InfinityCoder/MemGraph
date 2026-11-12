import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from . import llm
from .memory import FlatMemory, GraphMemory, extract_facts
from .evaluate import run_eval

load_dotenv()
app = FastAPI(title="MemGraph")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
MEM = {"flat": FlatMemory(), "graph": GraphMemory()}
CLOCK = [0]

class LLMCfg(BaseModel):
    provider: str = "mock"; model: str | None = None; api_key: str | None = None

class ChatReq(LLMCfg):
    message: str; memory: str = "graph"

class EvalReq(LLMCfg):
    users: int = 20; sessions: int = 8; k: int = 3

@app.get("/api/providers")
def providers(): return {"providers": list(llm.DEFAULTS), "defaults": llm.DEFAULTS}

@app.post("/api/chat")
def chat(r: ChatReq):
    CLOCK[0] += 1
    facts = extract_facts(r.message, r.provider, r.model, r.api_key)
    for m in MEM.values(): m.add(facts, r.message, CLOCK[0])
    ctx = MEM[r.memory].retrieve(r.message, 4)
    try:
        reply = llm.chat(f"Known about user:\n" + "\n".join(ctx) + f"\n\nUser: {r.message}",
                         "You are a personal assistant. Use known facts when relevant.", r.provider, r.model, r.api_key)
    except Exception as e:
        raise HTTPException(400, str(e))
    if not reply:
        reply = ("(mock mode) Noted: " + "; ".join(f"{s} {rel} {o}" for s, rel, o in facts)) if facts else "(mock mode) Memory context: " + (" | ".join(ctx) or "none")
    return {"reply": reply, "retrieved": ctx, "facts": facts}

@app.get("/api/graph")
def graph(): return MEM["graph"].graph()

@app.post("/api/reset")
def reset():
    MEM["flat"], MEM["graph"] = FlatMemory(), GraphMemory(); CLOCK[0] = 0; return {"ok": True}

@app.post("/api/eval")
def evaluate(r: EvalReq):
    return run_eval(min(r.users, 100), r.sessions, r.k, r.provider, r.model, r.api_key)
