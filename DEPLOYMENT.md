# Vogo Deployment Guide

## 🚀 CI/CD Pipeline

This project uses GitHub Actions for automated CI/CD deployment to EC2.

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   GitHub    │─────▶│ GitHub       │─────▶│   EC2       │
│   Actions   │      │ Actions      │      │   Server    │
└─────────────┘      └──────────────┘      └─────────────┘
                                                   │
                                            ┌──────▼──────┐
                                            │   Docker    │
                                            │   Compose   │
                                            └─────────────┘
                                                   │
                     ┌─────────────────────────────┼─────────────────────┐
                     │                             │                     │
              ┌──────▼──────┐           ┌─────────▼─────────┐   ┌──────▼──────┐
              │   Nginx     │           │   FastAPI         │   │  PostgreSQL │
              │   (Web)     │───────────│   (Backend)       │   │   (DB)      │
              └─────────────┘           └───────────────────┘   └─────────────┘
```

### Services

1. **PostgreSQL Database** - Data persistence
2. **FastAPI Backend** - REST API and business logic
3. **React Frontend** - User interface (served via Nginx)
4. **Nginx** - Reverse proxy and static file server

## 📋 Prerequisites

### GitHub Secrets

Configure these secrets in your GitHub repository (`Settings → Secrets and variables → Actions`):

| Secret Name | Description | Example |
|------------|-------------|---------|
| `EC2_SSH_KEY` | Private SSH key for EC2 access | `-----BEGIN RSA PRIVATE KEY-----...` |
| `EC2_USER` | EC2 username | `ubuntu` or `ec2-user` |
| `PROJECT_DIR` | Deployment directory on EC2 | `/srv/vogo` |
| `OPENAI_API_KEY` | OpenAI API key for LLM features | `sk-...` |

### EC2 Server Setup

1. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   ```

2. **Install Docker Compose** (if not included)
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Configure Security Group**
   - Port 22 (SSH) - For deployment
   - Port 80 (HTTP) - For web traffic
   - Port 443 (HTTPS) - Optional, for SSL

4. **Setup SSH Access**
   ```bash
   # On your local machine
   ssh-keygen -t rsa -b 4096 -C "vogo-deploy"
   
   # Copy public key to EC2
   ssh-copy-id ubuntu@18.170.49.10
   
   # Add private key to GitHub Secrets as EC2_SSH_KEY
   ```

## 🔄 Deployment Pipeline

### Workflow Stages

1. **Test** - Run Python tests with pytest
2. **Lint** - Check code quality with ESLint
3. **Security Scan** - Scan for vulnerabilities with Trivy (main branch only)
4. **Build** - Build Docker images and validate compose config
5. **Deploy** - Deploy to EC2 (main branch only)
6. **Validate** - Health checks and smoke tests

### Trigger Deployment

**Automatic:**
- Push to `main` branch triggers automatic deployment

**Manual:**
- Go to `Actions` tab in GitHub
- Select "CI/CD – Vogo" workflow
- Click "Run workflow"

### Deployment Process

1. GitHub Actions transfers code to EC2
2. Docker images are built on EC2
3. Database migrations run automatically
4. Services start with health checks
5. Validation confirms deployment success

## 🏗️ Local Development

### Using Docker Compose

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down

# Rebuild images
docker compose -f docker-compose.prod.yml build --no-cache
```

### Environment Configuration

1. Copy example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update variables in `.env`:
   ```bash
   # Generate secure JWT secret
   openssl rand -hex 32
   
   # Add to .env
   JWT_SECRET=<generated-secret>
   OPENAI_API_KEY=<your-api-key>
   ```

## 🔍 Monitoring & Debugging

### Health Checks

- **API Health**: `http://18.170.49.10/healthz`
- **API Docs**: `http://18.170.49.10/docs`
- **Web Interface**: `http://18.170.49.10/`

### View Logs

```bash
# SSH into EC2
ssh ubuntu@18.170.49.10

# View all logs
cd /srv/vogo
docker compose -f docker-compose.prod.yml logs

# View specific service
docker compose -f docker-compose.prod.yml logs api
docker compose -f docker-compose.prod.yml logs web
docker compose -f docker-compose.prod.yml logs db

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f
```

### Service Status

```bash
# Check running containers
docker compose -f docker-compose.prod.yml ps

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Troubleshooting

**Database Connection Issues:**
```bash
# Check database logs
docker compose -f docker-compose.prod.yml logs db

# Connect to database
docker exec -it $(docker ps -qf "name=db") psql -U vogo -d vogo
```

**API Not Starting:**
```bash
# Check API logs
docker compose -f docker-compose.prod.yml logs api

# Restart API service
docker compose -f docker-compose.prod.yml restart api
```

**Frontend Not Loading:**
```bash
# Check nginx logs
docker compose -f docker-compose.prod.yml logs web

# Check nginx configuration
docker exec $(docker ps -qf "name=web") nginx -t
```

## 🔐 Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Rotate JWT secrets regularly** - Update in production `.env`
3. **Keep OpenAI key secure** - Use GitHub Secrets
4. **Update dependencies** - Regular security patches
5. **Use HTTPS in production** - Add SSL certificate

## 📊 Database Migrations

Migrations run automatically on deployment. To run manually:

```bash
# SSH into EC2
ssh ubuntu@18.170.49.10

# Run migrations
cd /srv/vogo
docker exec $(docker ps -qf "name=api") alembic upgrade head

# Rollback migration
docker exec $(docker ps -qf "name=api") alembic downgrade -1

# Create new migration
docker exec $(docker ps -qf "name=api") alembic revision --autogenerate -m "description"
```

## 🚨 Rollback Procedure

If deployment fails:

1. **GitHub Actions automatically fetches logs** on failure

2. **Manual rollback**:
   ```bash
   # SSH into EC2
   ssh ubuntu@18.170.49.10
   
   # Navigate to project
   cd /srv/vogo
   
   # Checkout previous version
   git fetch origin
   git checkout <previous-commit-hash>
   
   # Rebuild and restart
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. **Database rollback**:
   ```bash
   docker exec $(docker ps -qf "name=api") alembic downgrade -1
   ```

## 📈 Scaling Considerations

Current setup is single-server. For scaling:

1. **Load Balancer** - Add AWS ALB in front of EC2
2. **Database** - Move to RDS for managed PostgreSQL
3. **Container Orchestration** - Consider ECS or Kubernetes
4. **CDN** - CloudFront for static assets
5. **Multi-region** - Deploy across regions for HA

## 📝 Maintenance

### Regular Tasks

- **Weekly**: Check logs for errors
- **Monthly**: Update dependencies
- **Quarterly**: Security audit and penetration testing

### Backup Strategy

```bash
# Backup database
docker exec $(docker ps -qf "name=db") pg_dump -U vogo vogo > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20231001.sql | docker exec -i $(docker ps -qf "name=db") psql -U vogo vogo
```

## 🆘 Support

For issues:
1. Check GitHub Actions logs
2. Review EC2 service logs
3. Verify environment configuration
4. Check database connectivity

---

**Deployment Status**: http://18.170.49.10/  
**API Documentation**: http://18.170.49.10/docs  
**Health Check**: http://18.170.49.10/healthz

