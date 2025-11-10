#!/bin/bash
# Start Backend API for vogoplus.app
# This script starts the FastAPI backend on port 8000
# For local development, use scripts/dev-local.sh instead

set -e

echo "🚀 Starting Backend API..."

# Find project directory (production paths)
PROJECT_DIR=""
if [ -d "/srv/vogo/backend" ]; then
    PROJECT_DIR="/srv/vogo"
elif [ -d "/home/ubuntu/vogo/backend" ]; then
    PROJECT_DIR="/home/ubuntu/vogo"
elif [ -d "$HOME/vogo/backend" ]; then
    PROJECT_DIR="$HOME/vogo"
elif [ -d "./backend" ]; then
    # Current directory is project root
    PROJECT_DIR="$(pwd)"
else
    echo "❌ Could not find project directory. Please specify:"
    echo "   PROJECT_DIR=/path/to/vogo bash $0"
    echo ""
    echo "💡 For local development, use: bash scripts/dev-local.sh"
    exit 1
fi

echo "📁 Using project directory: $PROJECT_DIR"

# Source common setup functions
# This script shares setup logic with scripts/dev-local.sh
setup_backend() {
    local backend_dir="$1"
    cd "$backend_dir"
    
    # Check if virtual environment exists
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
    if [ ! -f ".deps_installed" ] || [ requirements.txt -nt .deps_installed ]; then
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
        if [ -f "../.env.example" ]; then
            cp ../.env.example .env
            echo "✅ Created .env from .env.example"
            echo "⚠️  Please update .env with your configuration"
        elif [ -f ".env.example" ]; then
            cp .env.example .env
            echo "✅ Created .env from .env.example"
            echo "⚠️  Please update .env with your configuration"
        else
            echo "❌ No .env.example found. Please create .env manually."
            exit 1
        fi
    fi

    # Run database migrations
    echo "🔄 Running database migrations..."
    alembic upgrade head || echo "⚠️  Migrations may have failed - continuing anyway"
}

# Setup backend
setup_backend "$PROJECT_DIR/backend"
cd "$PROJECT_DIR/backend"

# Start the backend
echo "🚀 Starting FastAPI backend on port 8000..."
echo "📡 API will be available at: http://localhost:8000"
echo "📚 API docs at: http://localhost:8000/docs"
echo "🏥 Health check: http://localhost:8000/healthz"
echo ""
echo "Press Ctrl+C to stop the server"

uvicorn main:app --host 0.0.0.0 --port 8000 --reload

