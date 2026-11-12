$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath ".venv\Scripts\python.exe")) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Push-Location frontend
try {
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
Write-Host "Starting backend at http://localhost:8000. In another terminal run: cd frontend; npm run dev"
& .\.venv\Scripts\python.exe -m uvicorn backend.app:app --reload --port 8000
