#!/usr/bin/env bash
# Don't use set -e — we want to handle errors ourselves

echo "========================================"
echo "⚡ GaitRehab Container Starting"
echo "  Python: $(python3 --version 2>&1)"
echo "  Node:   $(node --version 2>&1)"
echo "========================================"

# Pre-flight: verify FastAPI can import
echo ""
echo "⚡ Pre-flight check: verifying Python imports..."
python3 -c "
from fastapi_app.main import app
print('  ✅ FastAPI app imports OK')
print('  Routes:', len([r for r in app.routes if hasattr(r, 'methods')]))
" 2>&1

if [ $? -ne 0 ]; then
    echo "  ❌ FATAL: FastAPI app failed to import!"
    echo "  Listing installed packages for debugging:"
    pip list 2>&1 | grep -iE 'fastapi|uvicorn|pydantic|bcrypt|jwt|motor|email|dotenv'
    echo ""
    echo "  Starting Next.js only (API will not work)..."
fi

# Start FastAPI backend — log output so crashes are visible
echo ""
echo "⚡ Starting FastAPI backend on 127.0.0.1:8000..."
uvicorn fastapi_app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 2 \
    --timeout-keep-alive 120 2>&1 &
FASTAPI_PID=$!

# Wait for FastAPI to become ready (up to 15 seconds)
echo "⚡ Waiting for FastAPI to be ready..."
READY=false
for i in $(seq 1 15); do
    if curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
        echo "  ✅ FastAPI is ready (took ${i}s)"
        READY=true
        break
    fi
    # Check if process died
    if ! kill -0 $FASTAPI_PID 2>/dev/null; then
        echo "  ❌ FATAL: FastAPI process crashed during startup!"
        echo "  Check logs above for the Python traceback."
        break
    fi
    sleep 1
done

if [ "$READY" = false ]; then
    echo "  ⚠️  FastAPI may not be running. Next.js will start anyway."
fi

# Start Next.js frontend in foreground on Render public $PORT
echo ""
echo "⚡ Starting Next.js frontend on 0.0.0.0:${PORT:-3000}..."
cd frontend
exec npm start
