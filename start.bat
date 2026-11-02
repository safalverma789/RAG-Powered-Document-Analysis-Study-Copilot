@echo off
title AURA RAG Study Copilot Launcher
echo ===================================================
echo   Starting AURA RAG Study Copilot Full Stack
echo ===================================================

echo [0/2] Ensuring ports 8000 and 5173 are free...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [1/2] Launching FastAPI Backend on port 8000...
start "AURA Backend (FastAPI)" /D "%~dp0backend" cmd /k ".venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Launching React + Vite Frontend on port 5173...
start "AURA Frontend (Vite)" /D "%~dp0frontend" cmd /k "npm.cmd run dev"

echo.
echo Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173/ ...
start http://localhost:5173/

echo ===================================================
echo   AURA Copilot is up and running!
echo   Frontend: http://localhost:5173/
echo   Backend:  http://127.0.0.1:8000/
echo   To stop both servers anytime, run: stop.bat
echo ===================================================

