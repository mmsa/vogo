#!/bin/bash
# EC2 Setup Script for Vogo
# Run this script once on a fresh EC2 instance

set -euo pipefail

echo "🚀 Setting up EC2 instance for Vogo deployment..."

# Update system
echo "📦 Updating system packages..."
sudo yum update -y || sudo apt-get update -y

# Install Docker
if ! command -v docker >/dev/null 2>&1; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    echo "🐙 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install useful tools
echo "🔧 Installing useful tools..."
sudo yum install -y git curl wget vim htop || sudo apt-get install -y git curl wget vim htop

# Create project directory
PROJECT_DIR="/srv/vogo"
echo "📁 Creating project directory at $PROJECT_DIR..."
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Configure firewall (if firewalld is active)
if command -v firewall-cmd >/dev/null 2>&1; then
    echo "🔥 Configuring firewall..."
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
fi

# Enable Docker to start on boot
echo "🔄 Enabling Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

# Print status
echo ""
echo "✅ EC2 setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add your SSH public key to ~/.ssh/authorized_keys"
echo "2. Copy the private key and add it to GitHub Secrets as EC2_SSH_KEY"
echo "3. Add OPENAI_API_KEY to GitHub Secrets"
echo "4. Push to main branch to trigger deployment"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs: docker compose -f $PROJECT_DIR/docker-compose.prod.yml logs -f"
echo "  - Restart services: docker compose -f $PROJECT_DIR/docker-compose.prod.yml restart"
echo "  - Check status: docker compose -f $PROJECT_DIR/docker-compose.prod.yml ps"
echo ""
echo "🌐 After deployment, access your app at:"
echo "  - Web: http://$(curl -s ifconfig.me)/"
echo "  - API Docs: http://$(curl -s ifconfig.me)/docs"
echo "  - Health: http://$(curl -s ifconfig.me)/healthz"

