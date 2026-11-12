#!/usr/bin/env bash

if [ ! -d .venv ]; then
    python -m venv .venv || exit 1
fi

if [ -f .venv/Scripts/activate ]; then
    source .venv/Scripts/activate
elif [ -f .venv/bin/activate ]; then
    source .venv/bin/activate
else
    echo "Could not find the virtual environment activation script in .venv." >&2
    exit 1
fi

pip install -r backend/requirements.txt || exit 1

(cd frontend && npm install && npm run dev) &
python -m uvicorn backend.app:app --reload --port 8000
