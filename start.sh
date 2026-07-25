#!/usr/bin/env bash
# Exit on unexpected error
set -e

# Start FastAPI backend in background on internal port 8000
echo "⚡ Starting FastAPI backend server on 127.0.0.1:8000..."
uvicorn fastapi_app.main:app --host 127.0.0.1 --port 8000 &

# Wait 2 seconds for FastAPI startup
sleep 2

# Start Next.js frontend in foreground on Render public $PORT
echo "⚡ Starting Next.js frontend server on 0.0.0.0:$PORT..."
cd frontend
exec npm start
