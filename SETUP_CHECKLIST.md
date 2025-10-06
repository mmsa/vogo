# 🚀 Vogo CI/CD Setup Checklist

## ✅ Files Created

### Docker Infrastructure
- [x] `Dockerfile.backend` - Backend API containerization
- [x] `Dockerfile.web` - Frontend with Nginx
- [x] `docker-compose.prod.yml` - Production orchestration
- [x] `nginx.conf` - Reverse proxy configuration
- [x] `.dockerignore` - Build optimization

### CI/CD Pipeline
- [x] `.github/workflows/deploy.yml` - GitHub Actions workflow
- [x] `.env.example` - Environment template

### Scripts
- [x] `scripts/setup-ec2.sh` - EC2 one-time setup
- [x] `scripts/local-deploy.sh` - Local deployment testing

### Documentation
- [x] `DEPLOYMENT.md` - Comprehensive deployment guide
- [x] `CI_CD_SETUP.md` - CI/CD implementation details
- [x] `SETUP_CHECKLIST.md` - This checklist

### Backend Updates
- [x] Updated `main.py` with environment-based CORS
- [x] Enhanced health check endpoint

## 📋 Pre-Deployment Checklist

### 1. GitHub Repository Setup
- [ ] Push all changes to GitHub
  ```bash
  git add .
  git commit -m "Add CI/CD pipeline"
  git push origin main
  ```

### 2. EC2 Instance Preparation
- [ ] SSH access verified: `ssh ubuntu@18.170.49.10`
- [ ] Run setup script:
  ```bash
  ssh ubuntu@18.170.49.10 'bash -s' < scripts/setup-ec2.sh
  ```

### 3. GitHub Secrets Configuration
Go to: `Repository → Settings → Secrets and variables → Actions → New repository secret`

- [ ] `EC2_SSH_KEY` - Your private SSH key
  ```bash
  cat ~/.ssh/id_rsa  # Copy this entire output
  ```

- [ ] `EC2_USER` - Set to `ubuntu` (or `ec2-user`)

- [ ] `PROJECT_DIR` - Set to `/srv/vogo` (optional, defaults to this)

- [ ] `OPENAI_API_KEY` - Your OpenAI API key
  ```bash
  # Get from: https://platform.openai.com/api-keys
  ```

### 4. Environment Verification
- [ ] `.env.example` file exists
- [ ] All environment variables documented
- [ ] CORS origins include EC2 IP

## 🚀 First Deployment

### Option 1: Automatic (Recommended)
```bash
git push origin main
```
Then monitor: https://github.com/YOUR_USERNAME/vogo/actions

### Option 2: Manual Trigger
1. Go to GitHub Actions tab
2. Select "CI/CD – Vogo" workflow
3. Click "Run workflow" → "Run workflow"

### Option 3: Local Testing First
```bash
./scripts/local-deploy.sh
# If successful, then push to trigger remote deployment
```

## 🔍 Post-Deployment Verification

### 1. Check Deployment Status
- [ ] GitHub Actions workflow completed successfully
- [ ] All pipeline stages passed (Test → Build → Deploy → Validate)

### 2. Verify Services
- [ ] Web: http://18.170.49.10/
- [ ] API Docs: http://18.170.49.10/docs
- [ ] Health: http://18.170.49.10/healthz

### 3. Test Functionality
```bash
# Health check
curl http://18.170.49.10/healthz

# API test
curl http://18.170.49.10/api/memberships

# Frontend loads
curl -I http://18.170.49.10/
```

### 4. Check Logs
```bash
ssh ubuntu@18.170.49.10
cd /srv/vogo
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50
```

## 🐛 Troubleshooting

### Deployment Fails
1. Check GitHub Actions logs for errors
2. Verify GitHub Secrets are correctly set
3. Ensure EC2 SSH access works
4. Check EC2 Docker installation

### Health Check Fails
```bash
# SSH to EC2
ssh ubuntu@18.170.49.10

# Check service status
cd /srv/vogo
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs api
docker compose -f docker-compose.prod.yml logs web
docker compose -f docker-compose.prod.yml logs db

# Restart services
docker compose -f docker-compose.prod.yml restart
```

### Database Issues
```bash
# Check database
docker exec $(docker ps -qf "name=db") pg_isready -U vogo

# Run migrations manually
docker exec $(docker ps -qf "name=api") alembic upgrade head

# Reset database (CAUTION: data loss)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
```

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ GitHub Actions workflow shows green checkmark
- ✅ http://18.170.49.10/ loads the web interface
- ✅ http://18.170.49.10/docs shows API documentation
- ✅ http://18.170.49.10/healthz returns `{"status":"ok"}`
- ✅ All Docker containers are running and healthy
- ✅ Database migrations completed successfully

## 📚 Next Steps

After successful deployment:

1. **Setup Domain** (Optional)
   - Point your domain to 18.170.49.10
   - Update nginx.conf with server_name
   - Update ALLOWED_ORIGINS in .env

2. **Add SSL Certificate** (Optional)
   - Use Let's Encrypt with certbot
   - Update nginx.conf for HTTPS
   - Configure automatic renewal

3. **Setup Monitoring** (Recommended)
   - CloudWatch for logs and metrics
   - Uptime monitoring (UptimeRobot, Pingdom)
   - Error tracking (Sentry)

4. **Configure Backups**
   - Database backup schedule
   - Application data backups
   - Backup restoration testing

5. **Security Hardening**
   - Enable firewall (ufw/firewalld)
   - Configure fail2ban
   - Regular security updates
   - Rotate secrets periodically

## 🔗 Quick Links

- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **CI/CD Details**: [CI_CD_SETUP.md](CI_CD_SETUP.md)
- **Local Development**: [GETTING_STARTED.md](GETTING_STARTED.md)
- **GitHub Actions**: https://github.com/YOUR_USERNAME/vogo/actions

## 📞 Support

If you encounter issues:
1. Check this checklist
2. Review [DEPLOYMENT.md](DEPLOYMENT.md)
3. Check GitHub Actions logs
4. Review Docker logs on EC2
5. Verify environment configuration

---

**Last Updated**: $(date)  
**Deployment Target**: EC2 @ 18.170.49.10  
**Pipeline**: GitHub Actions

