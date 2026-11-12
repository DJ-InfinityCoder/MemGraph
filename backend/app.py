import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from . import llm
from .memory import FlatMemory, GraphMemory, extract_facts
from .evaluate import run_eval

load_dotenv()
app = FastAPI(title="MemGraph - Gemini 3.8 Flash Agentic Memory")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MEM = {"flat": FlatMemory(), "graph": GraphMemory()}
CLOCK = [0]
MODEL_NAME = "gemini-3.8-flash"

class ChatReq(BaseModel):
    message: str
    memory: str = "graph"

class EvalReq(BaseModel):
    users: int = 20
    sessions: int = 8
    k: int = 3

@app.get("/api/status")
def status():
    """Return backend status for Gemini 3.8 Flash."""
    has_key = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "model": MODEL_NAME,
        "provider": "gemini",
        "configured": has_key
    }

@app.get("/api/providers")
def providers():
    """Backward compatibility for cached clients."""
    return {"providers": ["gemini"], "defaults": {"gemini": MODEL_NAME}}

@app.post("/api/chat")
def chat(r: ChatReq):
    CLOCK[0] += 1
    facts = extract_facts(r.message, model=MODEL_NAME)
    for m in MEM.values():
        m.add(facts, r.message, CLOCK[0])
    ctx = MEM[r.memory].retrieve(r.message, 4)

    try:
        reply = llm.chat(
            f"Known about user:\n" + "\n".join(ctx) + f"\n\nUser: {r.message}",
            "You are a personal assistant. Use known facts when relevant to personalize your response.",
            model=MODEL_NAME
        )
    except Exception as e:
        err_msg = str(e)
        if "503" in err_msg or "high demand" in err_msg.lower():
            prefix = "(Gemini 3.8 Flash high demand / 503 fallback)"
        elif "timeout" in err_msg.lower():
            prefix = "(Gemini 3.8 Flash network timeout)"
        elif not os.getenv("GEMINI_API_KEY"):
            prefix = "(Gemini 3.8 Flash: GEMINI_API_KEY not found in .env)"
        else:
            prefix = f"(Gemini 3.8 Flash offline: {err_msg})"

        reply = (
            f"{prefix} "
            + (f"Noted: {'; '.join(f'{s} {rel} {o}' for s, rel, o in facts)}" if facts else f"Memory context: {' | '.join(ctx) if ctx else 'none'}")
        )

    if not reply:
        reply = (
            ("Noted: " + "; ".join(f"{s} {rel} {o}" for s, rel, o in facts))
            if facts else ("Memory context: " + (" | ".join(ctx) or "none"))
        )

    return {"reply": reply, "retrieved": ctx, "facts": facts, "model": MODEL_NAME}

@app.get("/api/graph")
def graph():
    return MEM["graph"].graph()

@app.post("/api/reset")
def reset():
    MEM["flat"], MEM["graph"] = FlatMemory(), GraphMemory()
    CLOCK[0] = 0
    return {"ok": True}

@app.post("/api/eval")
def evaluate(r: EvalReq):
    return run_eval(min(r.users, 100), r.sessions, r.k, model=MODEL_NAME)
