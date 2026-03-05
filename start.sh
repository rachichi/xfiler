#!/usr/bin/env bash
#
# xfiler - Portable Launcher
#
# Usage: Drop the xfiler/ folder into any Google Photos Takeout directory, then:
#   cd xfiler && ./start.sh
#
# Starts the Python API server and Vite dev server.
# Open http://localhost:5173 in your browser.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check dependencies
command -v python3 >/dev/null 2>&1 || { echo "Error: python3 is required"; exit 1; }
command -v node >/dev/null 2>&1    || { echo "Error: node is required"; exit 1; }

if [ ! -d "node_modules" ]; then
  echo "Error: node_modules not found. Run 'npm install' first."
  exit 1
fi

echo "Starting xfiler..."
echo ""

# Start Python backend on port 8025
python3 server.py &
PYTHON_PID=$!

# Give the backend a moment to index
sleep 3

# Start Vite dev server
./node_modules/.bin/vite &
VITE_PID=$!

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $PYTHON_PID 2>/dev/null
  kill $VITE_PID 2>/dev/null
  wait $PYTHON_PID 2>/dev/null
  wait $VITE_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

echo ""
echo "  Backend API: http://localhost:8025"
echo "  Frontend:    http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

wait
