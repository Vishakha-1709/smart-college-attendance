@echo off
title Smart College Attendance System - ITM SLS Baroda University
echo ==============================================================================
echo    ITM SLS BARODA UNIVERSITY, VADODARA
echo    Course: JavaScript Framework (PBL) - C2620A3
echo    Smart College Attendance System with Face Recognition
echo    Tech Stack: React 18 (Vite), Node.js Express, MongoDB, Face-api.js
echo    Students: Vishakha (24C22075) ^& Jithendar (24C22074) - B.TECH CSE(AI) Class 4
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [Clearing previous background processes on ports 5000 & 5173...]
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [1/3] Starting Express Backend with MongoDB (Port 5000)...
start "Backend API (Node.js + MongoDB)" cmd /k "cd /d "%~dp0server" && npm start"

echo [2/3] Starting React Frontend with Vite (Port 5173)...
start "React Frontend (Vite)" cmd /k "cd /d "%~dp0client" && npm run dev"

echo [3/3] Opening Web Browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ==============================================================================
echo Application successfully launched!
echo  - Backend API:  http://localhost:5000
echo  - React Web UI: http://localhost:5173
echo ==============================================================================
echo (Keep the Backend and Frontend command prompt windows open while using the app)
echo.
pause
