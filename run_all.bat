@echo off
setlocal enabledelayedexpansion
set "GREEN=[32m"
set "RED=[31m"
set "YELLOW=[33m"
set "RESET=[0m"

echo ------------------------------------------------------------------
echo %GREEN%🚀 Launching HealthPredict AI Clinical Platform 🏥%RESET%
echo ------------------------------------------------------------------

:: Validate Environment
cd backend
python -m venv venv >nul 2>&1
call venv\Scripts\activate
python validate_env.py
if %errorlevel% neq 0 (
    echo.
    echo %RED%[CRITICAL ERROR] Initial checks failed.%RESET%
    echo %YELLOW%Please configure your .env files as instructed above then try again.%RESET%
    pause
    exit /b
)
cd ..

:: Launch Backend (FastAPI) in a separate window
echo.
echo %YELLOW%📡 Igniting FastAPI Neural Cluster (Port 8000)...%RESET%
start "HealthPredict - Backend" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload"

:: Wait for a moment to let the backend warm up
timeout /t 3 /nobreak >nul

:: Launch Frontend (Vite) in the current window
echo.
echo %YELLOW%🎨 Igniting Vite Reactive Interface (Port 5173)...%RESET%
cd frontend
call npm run dev

pause
