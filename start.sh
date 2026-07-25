#!/usr/bin/env bash
# Exit on unexpected error
set -e

echo "⚡ Container starting..."
echo "  Python: $(python3 --version)"
echo "  Node:   $(node --version)"

# Quick sanity check — can FastAPI import without crashing?
echo "⚡ Pre-flight: checking FastAPI app imports..."
python3 -c "from fastapi_app.main import app; print('  ✅ FastAPI app imports OK')" || {
    echo "  ❌ FastAPI app import FAILED — check Python dependencies"
    # Still start Next.js so the user sees something
}

# Start FastAPI backend in background on internal port 8000
echo "⚡ Starting FastAPI backend server on 127.0.0.1:8000..."
uvicorn fastapi_app.main:app --host 127.0.0.1 --port 8000 &

# Wait for FastAPI to become ready (up to 10 seconds)
echo "⚡ Waiting for FastAPI to be ready..."
for i in $(seq 1 10); do
    if curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
        echo "  ✅ FastAPI is ready (took ${i}s)"
        break
    fi
    sleep 1
done

# Start Next.js frontend in foreground on Render public $PORT
echo "⚡ Starting Next.js frontend server on 0.0.0.0:$PORT..."
cd frontend
exec npm start
