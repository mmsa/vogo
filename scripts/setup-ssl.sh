#!/bin/bash
# SSL Certificate Setup Script for app.vogoplus.app
# This script sets up Let's Encrypt SSL certificates using Certbot

set -e

DOMAIN="app.vogoplus.app"
EMAIL="${CERTBOT_EMAIL:-admin@vogoplus.app}"

echo "🔒 Setting up SSL certificate for $DOMAIN..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# Ensure nginx is running and configured
echo "🔍 Checking Nginx configuration..."
if [ ! -f "/etc/nginx/sites-available/vogoplus-app" ]; then
    echo "❌ Nginx configuration not found. Please deploy the app first."
    exit 1
fi

# Test nginx configuration
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration has errors. Please fix them first."
    exit 1
fi

# Create certbot webroot directory if it doesn't exist
sudo mkdir -p /var/www/certbot

# Obtain SSL certificate
echo "📜 Obtaining SSL certificate from Let's Encrypt..."
echo "   Using email: $EMAIL"
echo "   Domain: $DOMAIN"

# Use certbot with nginx plugin to automatically configure SSL
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL \
    --redirect --hsts --uir --staple-ocsp

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained and configured successfully!"
    echo ""
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    
    echo ""
    echo "✅ SSL setup complete!"
    echo "🌐 Your site is now available at: https://$DOMAIN"
    echo ""
    echo "📅 Certificate will auto-renew. To test renewal:"
    echo "   sudo certbot renew --dry-run"
else
    echo "❌ Failed to obtain SSL certificate."
    echo ""
    echo "Common issues:"
    echo "1. DNS not pointing to this server"
    echo "2. Port 80 not accessible from internet"
    echo "3. Domain already has a certificate"
    exit 1
fi

