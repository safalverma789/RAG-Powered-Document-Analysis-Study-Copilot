@echo off
title Stop AURA RAG Study Copilot
echo ===================================================
echo   Stopping AURA RAG Study Copilot Servers...
echo ===================================================

echo Stopping Backend (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo ===================================================
echo   All servers have been successfully stopped!
echo ===================================================
timeout /t 2 >nul
