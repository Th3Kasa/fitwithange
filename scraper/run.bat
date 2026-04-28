@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  run.bat — FitWithAnge Instagram scraper pipeline (Windows)
REM  Activates (or creates) a venv, installs deps, runs the
REM  full pipeline: scrape → analyze → inject
REM ============================================================

set SCRIPT_DIR=%~dp0
set VENV_DIR=%SCRIPT_DIR%venv

echo [run] FitWithAnge Instagram Scraper Pipeline
echo [run] Working directory: %SCRIPT_DIR%
echo.

REM ---- Create venv if it doesn't exist ----------------------
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo [run] Creating Python virtual environment ...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo [run] ERROR: Failed to create venv. Is Python 3.10+ installed?
        echo [run]        Run: python --version  to check.
        pause
        exit /b 1
    )
    echo [run] Virtual environment created.
)

REM ---- Activate venv ----------------------------------------
call "%VENV_DIR%\Scripts\activate.bat"
echo [run] Virtual environment activated.

REM ---- Install / upgrade requirements -----------------------
echo [run] Installing requirements ...
pip install --quiet --upgrade pip
pip install --quiet -r "%SCRIPT_DIR%requirements.txt"
if errorlevel 1 (
    echo [run] ERROR: pip install failed.
    pause
    exit /b 1
)
echo [run] Requirements installed.
echo.

REM ---- Change to scraper directory --------------------------
cd /d "%SCRIPT_DIR%"

REM ---- Step 1: Scrape ---------------------------------------
echo [run] ===== STEP 1 / 3 : SCRAPE =====
python scrape.py %*
if errorlevel 1 (
    echo.
    echo [run] Scrape step failed or was interrupted.
    echo [run] Partial data may have been saved. Check output/ folder.
    pause
    exit /b 1
)
echo.

REM ---- Step 2: Analyze --------------------------------------
echo [run] ===== STEP 2 / 3 : ANALYZE =====
python analyze.py
if errorlevel 1 (
    echo.
    echo [run] Analyze step failed. Check output/posts/ for data.
    pause
    exit /b 1
)
echo.

REM ---- Step 3: Inject ---------------------------------------
echo [run] ===== STEP 3 / 3 : INJECT =====
python inject.py
if errorlevel 1 (
    echo.
    echo [run] Inject step failed.
    pause
    exit /b 1
)
echo.

echo ============================================================
echo  PIPELINE COMPLETE
echo ============================================================
echo  Review:  ..\REPLACEMENTS.md
echo  Then run: python inject.py --apply  (when ready)
echo ============================================================
echo.
pause
