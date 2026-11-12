@echo off
echo Starting MemGraph...

if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat
echo Installing backend requirements...
pip install -r backend\requirements.txt

echo Starting frontend in separate window...
start "MemGraph Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Starting backend API...
uvicorn backend.app:app --reload --port 8000
