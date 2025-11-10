#!/bin/bash
# Deploy Web App to Nginx (for app.vogoplus.app)
# This script builds the web app and deploys it to Nginx

set -e

echo "🚀 Deploying Web App to Nginx..."

# Find project directory (check common locations)
PROJECT_DIR=""
if [ -d "/srv/vogo/web" ]; then
    PROJECT_DIR="/srv/vogo"
elif [ -d "/home/ubuntu/vogo/web" ]; then
    PROJECT_DIR="/home/ubuntu/vogo"
elif [ -d "$HOME/vogo/web" ]; then
    PROJECT_DIR="$HOME/vogo"
else
    echo "❌ Could not find project directory. Please specify:"
    echo "   PROJECT_DIR=/path/to/vogo bash $0"
    exit 1
fi

echo "📁 Using project directory: $PROJECT_DIR"

# Build the web app
echo "🔨 Building web app..."
cd "$PROJECT_DIR/web"
npm install
npm run build

# Deploy to Nginx
echo "📦 Deploying to Nginx..."
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r "$PROJECT_DIR/web/dist/"* /usr/share/nginx/html/
sudo chown -R www-data:www-data /usr/share/nginx/html

# Test and reload Nginx
echo "🔄 Testing and reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Web app deployed successfully!"
echo "🌐 App should be available at: http://app.vogoplus.app"

