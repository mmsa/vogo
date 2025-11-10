#!/bin/bash
# Local Development Script
# Starts database and backend for local development
# Frontend should be started separately with: cd web && npm run dev

set -e

echo "🏠 Starting Local Development Environment..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    else
        # Linux
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    fi
    
    echo "✅ Created .env file with generated JWT_SECRET"
    echo "⚠️  Remember to add your OPENAI_API_KEY to .env"
    echo ""
fi

# Start database
echo "🐘 Starting PostgreSQL database..."
cd ops
docker compose up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
for i in {1..30}; do
    if docker compose exec -T db pg_isready -U vogo >/dev/null 2>&1; then
        echo "✅ Database is ready"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 1
done

cd ..

# Check if backend virtual environment exists
cd backend
if [ ! -d ".venv" ] && [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
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
    echo "📥 Installing Python dependencies..."
    pip install -r requirements.txt
    touch .deps_installed
fi

# Copy .env if it exists in parent directory
if [ ! -f ".env" ] && [ -f "../.env" ]; then
    cp ../.env .env
fi

# Run database migrations
echo "🔄 Running database migrations..."
alembic upgrade head || echo "⚠️  Migrations may have failed - continuing anyway"

# Start the backend
echo ""
echo "🚀 Starting FastAPI backend..."
echo "📡 API will be available at: http://localhost:8000"
echo "📚 API docs at: http://localhost:8000/docs"
echo "🏥 Health check: http://localhost:8000/healthz"
echo ""
echo "💡 Frontend: Run 'cd web && npm run dev' in another terminal"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload

