@echo off
title Antigravity Stock Watchlist Launcher
echo Starting Antigravity Stock Watchlist Web Server & Scheduler...

cd /d "c:\Users\DELL\Documents\Stock Watchlist"

set PYTHON_EXE="C:\Users\DELL\.gemini\antigravity\scratch\indian-stock-analyzer\.venv\Scripts\python.exe"

if not exist %PYTHON_EXE% (
    set PYTHON_EXE=python
)

echo Starting HTTP Server & Localtunnel Remote Access...
start "Antigravity Server" %PYTHON_EXE% server.py

timeout /t 3 /nobreak >nul
echo Opening Dashboard...
start http://localhost:8080

echo Antigravity Watchlist is now running!
pause
