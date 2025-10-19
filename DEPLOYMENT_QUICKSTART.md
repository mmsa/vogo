# 🚀 VogPlus.ai Deployment Quick Start

Complete deployment guide in 10 steps. Follow this guide to deploy your entire stack.

---

## 📋 Overview

You will deploy:
- **Landing Page:** `www.vogplus.ai` (Static HTML)
- **Main App:** `app.vogplus.ai` (React + FastAPI)
- **Chrome Extension:** Available from landing page

**Time Required:** 2-3 hours (mostly waiting for DNS)

---

## Step 1: Prerequisites ✅

Before starting, ensure you have:

- [ ] **AWS Account** (free tier works)
- [ ] **Domain:** `vogplus.ai` registered in GoDaddy
- [ ] **OpenAI API Key** (for AI features)
- [ ] **SSH Key Pair** for EC2 access
- [ ] **Git Repository** (this code pushed to GitHub/GitLab)

---

## Step 2: AWS EC2 Setup (30 minutes) ⚙️

Follow the detailed AWS guide:

```bash
# Open this file:
cat AWS_SETUP.md
```

**Key Steps:**
1. Launch EC2 instance (t3.small recommended)
2. Allocate Elastic IP
3. Configure Security Group (ports 22, 80, 443)
4. Note your Elastic IP (you'll need it for DNS)

**📝 Write down your Elastic IP:** `___.___.___.___ `

---

## Step 3: GoDaddy DNS Configuration (15 minutes) 🌐

Follow the detailed GoDaddy guide:

```bash
# Open this file:
cat GODADDY_SETUP.md
```

**Add these 3 DNS records:**

| Type | Name | Value (Your Elastic IP) | TTL  |
|------|------|-------------------------|------|
| A    | @    | `54.123.45.67`          | 600  |
| A    | www  | `54.123.45.67`          | 600  |
| A    | app  | `54.123.45.67`          | 600  |

**⏱️ Wait 15-60 minutes for DNS propagation**

While waiting, you can proceed to Step 4.

---

## Step 4: Connect to EC2 and Install Software (20 minutes) 💻

### 4.1 SSH into EC2

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP
```

### 4.2 Run Quick Install Script

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install everything
sudo apt install -y nginx postgresql postgresql-contrib \
  python3.11 python3.11-venv python3-pip nodejs npm git \
  certbot python3-certbot-nginx
```

---

## Step 5: Setup Database (5 minutes) 🗄️

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE vogplus_db;
CREATE USER vogplus_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE vogplus_db TO vogplus_user;
\q
EOF
```

**📝 Save your database password:** `___________________`

---

## Step 6: Deploy Application Code (15 minutes) 📦

### 6.1 Clone Repository

```bash
# Create app directory
sudo mkdir -p /var/www/vogplus
sudo chown ubuntu:ubuntu /var/www/vogplus

# Clone your repo
cd /var/www/vogplus
git clone https://github.com/YOUR_USERNAME/vogo.git .
git checkout feature/landing-page
```

### 6.2 Setup Backend

```bash
cd /var/www/vogplus/backend

# Create virtual environment
python3.11 -m venv /var/www/vogplus/.venv
source /var/www/vogplus/.venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://vogplus_user:YOUR_PASSWORD@localhost/vogplus_db
SECRET_KEY=GENERATE_RANDOM_KEY_HERE
OPENAI_API_KEY=sk-your-openai-api-key-here
ALLOWED_ORIGINS=https://app.vogplus.ai,https://www.vogplus.ai,https://vogplus.ai
MODEL_RECO=gpt-4o-mini
MODEL_EXTRACT=gpt-4o-mini
SEARCH_PROVIDER=duckduckgo
AI_MAX_PAGES=3
EOF

# Edit .env and add your real values
nano .env

# Run migrations
alembic upgrade head
```

### 6.3 Setup Frontend

```bash
cd /var/www/vogplus/web

# Install dependencies
npm install

# Build for production
npm run build
```

---

## Step 7: Deploy Landing Page (5 minutes) 🎨

```bash
cd /var/www/vogplus

# Run deployment script
sudo ./scripts/deploy-landing.sh
```

This script will:
- ✅ Copy landing page to `/var/www/vogplus-landing`
- ✅ Configure Nginx for `www.vogplus.ai`
- ✅ Enable the site
- ✅ Reload Nginx

---

## Step 8: Configure Main App in Nginx (10 minutes) 🔧

```bash
# Create Nginx config for main app
sudo nano /etc/nginx/sites-available/vogplus-app
```

Paste this configuration:

```nginx
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

    # Frontend (React app)
    location / {
        root /var/www/vogplus/web/dist;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    gzip on;
    gzip_types text/css text/javascript application/javascript application/json;
}
```

Enable and test:

```bash
# Enable site
sudo ln -sf /etc/nginx/sites-available/vogplus-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 9: Setup Backend Service (10 minutes) 🔄

Create systemd service to keep backend running:

```bash
sudo nano /etc/systemd/system/vogplus-backend.service
```

Paste:

```ini
[Unit]
Description=VogPlus.ai Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/vogplus/backend
Environment="PATH=/var/www/vogplus/.venv/bin"
ExecStart=/var/www/vogplus/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
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

## Step 10: Install SSL Certificates (15 minutes) 🔒

Follow the detailed SSL guide:

```bash
# Open this file:
cat SSL_SETUP.md
```

**Quick Commands:**

```bash
# Install SSL for landing page
sudo certbot --nginx -d vogplus.ai -d www.vogplus.ai

# Install SSL for app
sudo certbot --nginx -d app.vogplus.ai

# Select "2" (Redirect HTTP to HTTPS) for both
```

**Test auto-renewal:**

```bash
sudo certbot renew --dry-run
```

---

## ✅ Verification Checklist

Test everything works:

### Landing Page
- [ ] Visit `http://vogplus.ai` → Redirects to HTTPS
- [ ] Visit `https://www.vogplus.ai` → Shows landing page
- [ ] Green lock icon appears
- [ ] Click "Get Started" → Goes to `https://app.vogplus.ai/register`

### Main App
- [ ] Visit `https://app.vogplus.ai` → Shows React app
- [ ] Visit `https://app.vogplus.ai/api/healthz` → Returns `{"status":"ok"}`
- [ ] Green lock icon appears
- [ ] Can register a new account
- [ ] Can log in

### Backend
- [ ] SSH into server: `sudo systemctl status vogplus-backend` → Active (running)
- [ ] View logs: `sudo journalctl -u vogplus-backend -f`
- [ ] No errors in logs

### Chrome Extension
- [ ] Build extension: `cd webext && npm run build`
- [ ] Load in Chrome: `chrome://extensions` → Load unpacked → Select `webext/dist`
- [ ] Extension shows in toolbar
- [ ] Can log in through extension

---

## 🎉 Success!

Your full stack is now deployed:

```
✅ Landing Page:  https://www.vogplus.ai
✅ Main App:      https://app.vogplus.ai
✅ Backend API:   https://app.vogplus.ai/api
✅ SSL Enabled:   All domains
✅ Auto-Restart:  Services restart on failure
✅ Auto-Renewal:  SSL certificates renew automatically
```

---

## 📊 Monitoring

### Check Service Status

```bash
# Backend
sudo systemctl status vogplus-backend

# Nginx
sudo systemctl status nginx

# View backend logs
sudo journalctl -u vogplus-backend -f

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check SSL Expiry

```bash
sudo certbot certificates
```

---

## 🔄 Updating Your App

When you make changes:

```bash
# SSH into EC2
ssh -i key.pem ubuntu@YOUR_IP

# Pull latest code
cd /var/www/vogplus
git pull origin main  # or feature/landing-page

# Update backend
cd backend
source /var/www/vogplus/.venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart vogplus-backend

# Update frontend
cd ../web
npm install
npm run build

# Update landing page
sudo cp -r ../landing/* /var/www/vogplus-landing/

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🆘 Troubleshooting

### DNS not resolving?
```bash
nslookup vogplus.ai
nslookup www.vogplus.ai
nslookup app.vogplus.ai
```
Wait longer (up to 24 hours) or flush your DNS cache.

### Backend not starting?
```bash
sudo journalctl -u vogplus-backend -n 50
```
Check for errors in environment variables or database connection.

### Nginx errors?
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Can't get SSL certificate?
```bash
# Verify DNS works first
curl -I http://vogplus.ai

# Check Nginx is running
sudo systemctl status nginx

# Try again
sudo certbot --nginx -d vogplus.ai -d www.vogplus.ai --debug
```

---

## 📞 Need Help?

Refer to detailed guides:
- **AWS Setup:** `AWS_SETUP.md`
- **GoDaddy DNS:** `GODADDY_SETUP.md`
- **SSL Setup:** `SSL_SETUP.md`
- **Landing Page:** `landing/README.md`

---

## 🚀 Next Steps

1. **Publish Chrome Extension** to Chrome Web Store
2. **Update landing page** with actual extension link
3. **Add Google Analytics** for tracking
4. **Setup monitoring** (AWS CloudWatch, UptimeRobot)
5. **Create backup strategy** for database
6. **Add email service** (AWS SES, SendGrid)
7. **Setup CI/CD** (GitHub Actions)
8. **Launch! 🎊**

Congratulations on your deployment! 🎉

