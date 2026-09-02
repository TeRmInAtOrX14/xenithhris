@echo off
title Brandigade Biometric Sync Agent GUI
cd /d "%~dp0"

echo Starting Brandigade Biometric Sync Agent GUI...
echo Loading server on http://localhost:3800 ...

start /b node gui-server.js > nul 2>&1

timeout /t 2 /nobreak > nul

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3800
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3800
) else (
    start http://localhost:3800
)
