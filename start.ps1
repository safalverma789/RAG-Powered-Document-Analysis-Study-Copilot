# AURA RAG Study Copilot - Single Command PowerShell Launcher

Write-Host "===================================================" -ForegroundColor Red
Write-Host "  Starting AURA RAG Study Copilot (Full Stack)" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Red

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Backend in separate process
Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; .\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

# 2. Start Frontend in separate process
Write-Host "[2/2] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm.cmd run dev"

Start-Sleep -Seconds 3

# 3. Open browser
Write-Host "Opening application in your default browser..." -ForegroundColor Green
Start-Process "http://localhost:5173/"

Write-Host "Done! Both servers are running." -ForegroundColor Green
