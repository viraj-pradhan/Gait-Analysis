#!/usr/bin/env bash
set -e

echo "📦 Installing Python backend dependencies..."
pip install -r requirements.txt

echo "📦 Installing Node.js frontend dependencies & building Next.js..."
cd frontend
npm install
npm run build
cd ..
echo "✅ Single-service build complete!"
