# AWS Setup Guide for VogPlus.ai

Complete guide to set up your AWS infrastructure for VogPlus.ai.

---

## 🎯 Architecture Overview

```
vogplus.ai (www.vogplus.ai)     → EC2 → Landing Page (Static HTML)
app.vogplus.ai                   → EC2 → Web App (React) + Backend (FastAPI)
```

---

## 📋 Prerequisites

- AWS Account
- Domain registered in GoDaddy: `vogplus.ai`
- SSH key pair for EC2 access

---

## Step 1: EC2 Instance Setup

### 1.1 Launch EC2 Instance

1. **Go to EC2 Dashboard** → Click "Launch Instance"

2. **Configure Instance:**
   ```
   Name: vogplus-production
   AMI: Ubuntu Server 22.04 LTS (Free Tier eligible)
   Instance Type: t3.small or t3.medium (recommended)
   Key pair: Create new or select existing
   ```

3. **Security Group Settings:**
   ```
   Name: vogplus-sg
   
   Inbound Rules:
   - SSH (22)        → Your IP only (for security)
   - HTTP (80)       → 0.0.0.0/0 (anywhere)
   - HTTPS (443)     → 0.0.0.0/0 (anywhere)
   - Custom TCP 8000 → 127.0.0.1/32 (localhost only - backend)
   - Custom TCP 5173 → 127.0.0.1/32 (localhost only - frontend)
   ```

4. **Storage:** 20 GB gp3 SSD (minimum)

5. **Click "Launch Instance"**

---

### 1.2 Allocate Elastic IP

1. Go to **EC2 → Elastic IPs**
2. Click **"Allocate Elastic IP address"**
3. Click **"Allocate"**
4. Select the new IP → **Actions** → **"Associate Elastic IP address"**
5. Select your `vogplus-production` instance
6. Click **"Associate"**

**📝 Note your Elastic IP:** (Example: `54.123.45.67`)

---

## Step 2: Connect to EC2 and Install Dependencies

### 2.1 SSH into EC2

```bash
ssh -i /path/to/your-key.pem ubuntu@54.123.45.67
```

### 2.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Install Required Software

```bash
# Install Nginx
sudo apt install -y nginx

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Git
sudo apt install -y git

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 3: Setup PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE vogplus_db;
CREATE USER vogplus_user WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE vogplus_db TO vogplus_user;
\q

# Exit postgres user
exit
```

---

## Step 4: Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www/vogplus
sudo chown ubuntu:ubuntu /var/www/vogplus

# Clone repository
cd /var/www/vogplus
git clone https://github.com/YOUR_USERNAME/vogo.git .

# Checkout main branch
git checkout main
```

---

## Step 5: Setup Backend (FastAPI)

```bash
cd /var/www/vogplus/backend

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://vogplus_user:YOUR_SECURE_PASSWORD_HERE@localhost/vogplus_db
SECRET_KEY=YOUR_RANDOM_SECRET_KEY_HERE
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
ALLOWED_ORIGINS=https://app.vogplus.ai,https://www.vogplus.ai,https://vogplus.ai
MODEL_RECO=gpt-4o-mini
MODEL_EXTRACT=gpt-4o-mini
SEARCH_PROVIDER=duckduckgo
AI_MAX_PAGES=3
EOF

# Run database migrations
alembic upgrade head

# Test backend
uvicorn main:app --host 0.0.0.0 --port 8000
# Press Ctrl+C after verifying it works
```

---

## Step 6: Setup Frontend (React + Vite)

```bash
cd /var/www/vogplus/web

# Install dependencies
npm install

# Build for production
npm run build

# The built files are now in web/dist/
```

---

## Step 7: Deploy Landing Page

```bash
cd /var/www/vogplus

# Run deployment script
sudo ./scripts/deploy-landing.sh
```

---

## Step 8: Configure Nginx (Full Setup)

Create the main Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/vogplus-full
```

Paste this configuration:

```nginx
# Landing page - www.vogplus.ai and vogplus.ai
server {
    listen 80;
    listen [::]:80;
    server_name vogplus.ai www.vogplus.ai;

    root /var/www/vogplus-landing;
    index index.html;

    # Redirect non-www to www
    if ($host = vogplus.ai) {
        return 301 $scheme://www.vogplus.ai$request_uri;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_types text/css text/javascript application/javascript application/json;
}

# Main app - app.vogplus.ai
server {
    listen 80;
    listen [::]:80;
    server_name app.vogplus.ai;

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for Vite HMR (development)
    location /ws {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend (React app)
    location / {
        root /var/www/vogplus/web/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_types text/css text/javascript application/javascript application/json;
}
```

Enable the configuration:

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Enable VogPlus site
sudo ln -sf /etc/nginx/sites-available/vogplus-full /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 9: Setup Systemd Services (Keep Apps Running)

### 9.1 Backend Service

```bash
sudo nano /etc/systemd/system/vogplus-backend.service
```

```ini
[Unit]
Description=VogPlus.ai Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/vogplus/backend
Environment="PATH=/var/www/vogplus/backend/.venv/bin"
ExecStart=/var/www/vogplus/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vogplus-backend
sudo systemctl start vogplus-backend
sudo systemctl status vogplus-backend
```

---

## Step 10: Install SSL Certificates (HTTPS)

```bash
# Install SSL for landing page
sudo certbot --nginx -d vogplus.ai -d www.vogplus.ai

# Install SSL for app
sudo certbot --nginx -d app.vogplus.ai

# Follow the prompts and select "Redirect HTTP to HTTPS" when asked
```

**Certbot will automatically:**
- Obtain SSL certificates from Let's Encrypt
- Update Nginx configuration
- Set up automatic renewal

---

## Step 11: Setup Automatic Renewal

Certbot sets up automatic renewal, but let's verify:

```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

---

## 🎉 Deployment Complete!

Your infrastructure is now set up:

```
✅ Landing page: https://www.vogplus.ai
✅ Main app:     https://app.vogplus.ai
✅ Backend API:  https://app.vogplus.ai/api
✅ SSL enabled
✅ Auto-renewing certificates
✅ Services auto-restart on failure
```

---

## 📊 Monitoring and Maintenance

### Check Service Status

```bash
# Backend status
sudo systemctl status vogplus-backend

# Nginx status
sudo systemctl status nginx

# View backend logs
sudo journalctl -u vogplus-backend -f

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart vogplus-backend

# Restart Nginx
sudo systemctl restart nginx

# Reload Nginx (zero downtime)
sudo systemctl reload nginx
```

### Update Application

```bash
cd /var/www/vogplus

# Pull latest code
git pull origin main

# Update backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart vogplus-backend

# Update frontend
cd ../web
npm install
npm run build

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔐 Security Best Practices

1. **Change default PostgreSQL password**
2. **Keep system updated:** `sudo apt update && sudo apt upgrade`
3. **Enable UFW firewall:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
4. **Regular backups of database:**
   ```bash
   pg_dump -U vogplus_user vogplus_db > backup_$(date +%Y%m%d).sql
   ```
5. **Monitor logs regularly**
6. **Rotate access keys periodically**

---

## 🆘 Troubleshooting

### Backend not starting?
```bash
sudo journalctl -u vogplus-backend -n 50
```

### Nginx errors?
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Database connection issues?
```bash
sudo -u postgres psql -c "SELECT 1"
```

### SSL certificate issues?
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

---

## 📞 Next Steps

1. ✅ Complete GoDaddy DNS setup (see `GODADDY_SETUP.md`)
2. ⏳ Wait for DNS propagation (15-60 minutes)
3. ✅ Test all domains
4. 🚀 Publish Chrome extension
5. 📝 Update landing page with extension link

