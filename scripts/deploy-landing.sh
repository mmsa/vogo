#!/bin/bash

###############################################################################
# VogPlus.app Landing Page Deployment Script
# 
# This script deploys the landing page to:
# - www.vogoplus.app (primary)
# - vogoplus.app (redirects to www)
###############################################################################

set -e  # Exit on error

echo "🚀 VogPlus.app Landing Page Deployment"
echo "======================================"

# Configuration
LANDING_DIR="/var/www/vogoplus-landing"
SOURCE_DIR="./landing"
NGINX_CONFIG="/etc/nginx/sites-available/vogoplus-landing"
NGINX_ENABLED="/etc/nginx/sites-enabled/vogoplus-landing"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "❌ Please run as root (sudo)"
   exit 1
fi

# Step 1: Create landing page directory
echo ""
echo "📁 Step 1: Creating landing page directory..."
mkdir -p $LANDING_DIR
echo "✅ Directory created: $LANDING_DIR"

# Step 2: Copy landing page files
echo ""
echo "📋 Step 2: Copying landing page files..."
cp -r $SOURCE_DIR/* $LANDING_DIR/
chown -R www-data:www-data $LANDING_DIR
chmod -R 755 $LANDING_DIR
echo "✅ Files copied and permissions set"

# Step 3: Create Nginx configuration
echo ""
echo "⚙️  Step 3: Creating Nginx configuration..."
cat > $NGINX_CONFIG << 'EOF'
# Landing page - www.vogoplus.app and vogoplus.app
server {
    listen 80;
    listen [::]:80;
    server_name vogoplus.app www.vogoplus.app;

    root /var/www/vogoplus-landing;
    index index.html;

    # Redirect non-www to www
    if ($host = vogoplus.app) {
        return 301 $scheme://www.vogoplus.app$request_uri;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/css text/javascript application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable access logs for assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico)$ {
        access_log off;
    }
}
EOF

echo "✅ Nginx configuration created"

# Step 4: Enable site
echo ""
echo "🔗 Step 4: Enabling Nginx site..."
ln -sf $NGINX_CONFIG $NGINX_ENABLED
echo "✅ Site enabled"

# Step 5: Test Nginx configuration
echo ""
echo "🧪 Step 5: Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Step 6: Reload Nginx
echo ""
echo "🔄 Step 6: Reloading Nginx..."
systemctl reload nginx
echo "✅ Nginx reloaded"

# Step 7: Check Nginx status
echo ""
echo "📊 Step 7: Checking Nginx status..."
systemctl status nginx --no-pager | head -10

echo ""
echo "✅ Landing page deployment complete!"
echo ""
echo "🌐 Your landing page is now available at:"
echo "   - http://www.vogoplus.app (primary)"
echo "   - http://vogoplus.app (redirects to www)"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Configure DNS in GoDaddy (see GODADDY_SETUP.md)"
echo "   2. Install SSL certificate (see SSL_SETUP.md)"
echo "   3. Update Chrome extension link when published"
echo ""

