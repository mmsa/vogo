#!/bin/bash
# Local deployment script for testing
# Simulates the production environment locally

set -euo pipefail

echo "🏠 Starting local deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
    
    echo "⚠️  Remember to add your OPENAI_API_KEY to .env"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true

# Clean up
echo "🧹 Cleaning up old images..."
docker system prune -f

# Build images
echo "🔨 Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for database
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
docker exec $(docker ps -qf "name=api") alembic upgrade head || echo "⚠️  Migrations may have failed - check if database is ready"

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Checking health..."
if curl -fsS http://localhost/healthz >/dev/null 2>&1; then
    echo "✅ Application is healthy!"
else
    echo "❌ Health check failed"
    echo "📋 Viewing logs..."
    docker compose -f docker-compose.prod.yml logs --tail=50
    exit 1
fi

# Show status
echo ""
echo "📊 Service status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 Local deployment complete!"
echo ""
echo "🌐 Access your application:"
echo "  - Web: http://localhost/"
echo "  - API Docs: http://localhost/docs"
echo "  - Health: http://localhost/healthz"
echo ""
echo "📋 Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Stop: docker compose -f docker-compose.prod.yml down"
echo "  - Restart: docker compose -f docker-compose.prod.yml restart"

