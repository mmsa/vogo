#!/bin/bash
# Start Backend API for vogoplus.app
# This script starts the FastAPI backend on port 8000

set -e

echo "🚀 Starting Backend API..."

# Find project directory
PROJECT_DIR=""
if [ -d "/srv/vogo/backend" ]; then
    PROJECT_DIR="/srv/vogo"
elif [ -d "/home/ubuntu/vogo/backend" ]; then
    PROJECT_DIR="/home/ubuntu/vogo"
elif [ -d "$HOME/vogo/backend" ]; then
    PROJECT_DIR="$HOME/vogo"
else
    echo "❌ Could not find project directory. Please specify:"
    echo "   PROJECT_DIR=/path/to/vogo bash $0"
    exit 1
fi

echo "📁 Using project directory: $PROJECT_DIR"

# Check if virtual environment exists
cd "$PROJECT_DIR/backend"
if [ ! -d ".venv" ] && [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if [ ! -f ".deps_installed" ]; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
    touch .deps_installed
fi

# Check if .env exists
if [ ! -f ".env" ] && [ -f "../.env" ]; then
    cp ../.env .env
fi

if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo "❌ No .env.example found. Please create .env manually."
        exit 1
    fi
fi

# Run database migrations
echo "🔄 Running database migrations..."
alembic upgrade head || echo "⚠️  Migrations may have failed - continuing anyway"

# Start the backend
echo "🚀 Starting FastAPI backend on port 8000..."
echo "📡 API will be available at: http://localhost:8000"
echo "📚 API docs at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"

uvicorn main:app --host 0.0.0.0 --port 8000 --reload

