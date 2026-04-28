#!/usr/bin/env bash
# ============================================================
#  run.sh — FitWithAnge Instagram scraper pipeline (Mac/Linux)
#  Activates (or creates) a venv, installs deps, runs the
#  full pipeline: scrape → analyze → inject
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

log() { echo "[run] $*"; }

log "FitWithAnge Instagram Scraper Pipeline"
log "Working directory: $SCRIPT_DIR"
echo

# ---- Require Python 3.10+ ----------------------------------
if ! command -v python3 &>/dev/null; then
    log "ERROR: python3 not found. Install Python 3.10+ and retry."
    exit 1
fi

PYTHON_VER=$(python3 -c 'import sys; print(sys.version_info[:2])')
log "Python version: $PYTHON_VER"

# ---- Create venv if missing --------------------------------
if [ ! -f "$VENV_DIR/bin/activate" ]; then
    log "Creating Python virtual environment ..."
    python3 -m venv "$VENV_DIR"
    log "Virtual environment created."
fi

# ---- Activate venv -----------------------------------------
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
log "Virtual environment activated."

# ---- Install / upgrade requirements ------------------------
log "Installing requirements ..."
pip install --quiet --upgrade pip
pip install --quiet -r "$SCRIPT_DIR/requirements.txt"
log "Requirements installed."
echo

# ---- Change to scraper directory ---------------------------
cd "$SCRIPT_DIR"

# ---- Step 1: Scrape ----------------------------------------
log "===== STEP 1 / 3 : SCRAPE ====="
# Pass through any extra args (e.g. --login username --max-posts 100)
python scrape.py "$@" || {
    log "Scrape step failed or was interrupted."
    log "Partial data may be in output/ — continuing to analyze/inject."
}
echo

# ---- Step 2: Analyze ---------------------------------------
log "===== STEP 2 / 3 : ANALYZE ====="
python analyze.py || {
    log "ERROR: Analyze step failed. Aborting."
    exit 1
}
echo

# ---- Step 3: Inject ----------------------------------------
log "===== STEP 3 / 3 : INJECT ====="
python inject.py || {
    log "ERROR: Inject step failed."
    exit 1
}
echo

cat <<EOF
============================================================
 PIPELINE COMPLETE
============================================================
 Review:  ../REPLACEMENTS.md
 Then run: python inject.py --apply  (when ready)
============================================================
EOF
