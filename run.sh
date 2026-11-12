#!/usr/bin/env bash
# Terminal 1: backend   |  Terminal 2: frontend
python -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt
(cd frontend && npm install && npm run dev) &
uvicorn backend.app:app --reload --port 8000
