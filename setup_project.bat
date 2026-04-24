@echo off
setlocal enabledelayedexpansion
set "GREEN=[32m"
set "RED=[31m"
set "YELLOW=[33m"
set "RESET=[0m"

echo ------------------------------------------------------------------
echo %GREEN%📡 HealthPredict AI: Universal Environment Provisioner 🚀%RESET%
echo ------------------------------------------------------------------

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[ERROR] Node.js is NOT installed. Please install from https://nodejs.org/%RESET%
    pause
    exit /b
)

:: Check for NPM
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[ERROR] NPM is NOT installed. Ensure Node.js is properly configured.%RESET%
    pause
    exit /b
)

:: Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%[ERROR] Python is NOT installed. Please install from https://python.org/%RESET%
    pause
    exit /b
)

echo.
echo %YELLOW%[1/5] Synchronizing Environment Credentials...%RESET%
if not exist "backend\.env" (
    echo [BACKEND] Creating .env from .env.example...
    copy "backend\.env.example" "backend\.env" >nul
) else (
    echo [BACKEND] .env already exists. Skipping.
)

if not exist "frontend\.env" (
    echo [FRONTEND] Creating .env from .env.example...
    copy "frontend\.env.example" "frontend\.env" >nul
) else (
    echo [FRONTEND] .env already exists. Skipping.
)

echo.
echo %YELLOW%[2/5] Configuring Backend Virtual Environment...%RESET%
cd backend
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate
echo [3/5] Injecting Machine Learning Dependencies...
pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo.
echo %YELLOW%[4/5] Initializing Frontend Reactive Architecture...%RESET%
cd frontend
call npm install
cd ..

echo.
echo %YELLOW%[5/5] Finalizing Clinical Data Structures...%RESET%
cd backend
call venv\Scripts\activate
echo [DATA] Generating datasets and training neural models...
python dataset_generator.py
python train_model.py
cd ..

echo.
echo ------------------------------------------------------------------
echo %GREEN%✅ SETUP COMPLETE: Project is now research-ready!%RESET%
echo %YELLOW%IMPORTANT: Add your API keys to backend/.env and frontend/.env%RESET%
echo 🚀 Use 'run_all.bat' to launch the Clinical Platform.
echo ------------------------------------------------------------------
pause
