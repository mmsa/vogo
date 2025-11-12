#!/bin/bash
# Verify CI/CD setup before deployment

set -e

echo "🔍 Verifying CI/CD Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required files
echo "📋 Checking required files..."

check_file() {
    if [ -f "$1" ]; then
        echo -e "  ${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "  ${RED}✗${NC} $1 (missing)"
        return 1
    fi
}

FILES=(
    "Dockerfile.backend"
    "Dockerfile.web"
    "docker-compose.prod.yml"
    "nginx.conf"
    ".dockerignore"
    ".env.example"
    ".github/workflows/deploy.yml"
    "scripts/setup-ec2.sh"
    "scripts/local-deploy.sh"
)

MISSING=0
for file in "${FILES[@]}"; do
    check_file "$file" || MISSING=$((MISSING+1))
done

echo ""

# Check Docker files syntax
echo "🐳 Validating Docker configurations..."

if docker compose -f docker-compose.prod.yml config >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} docker-compose.prod.yml is valid"
else
    echo -e "  ${RED}✗${NC} docker-compose.prod.yml has errors"
    MISSING=$((MISSING+1))
fi

echo ""

# Check .env.example
echo "⚙️  Checking environment template..."

REQUIRED_VARS=(
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "JWT_SECRET"
    "OPENAI_API_KEY"
    "ALLOWED_ORIGINS"
)

ENV_MISSING=0
for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env.example 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $var defined"
    else
        echo -e "  ${RED}✗${NC} $var missing from .env.example"
        ENV_MISSING=$((ENV_MISSING+1))
    fi
done

echo ""

# Check GitHub Actions workflow
echo "⚡ Validating GitHub Actions workflow..."

if [ -f ".github/workflows/deploy.yml" ]; then
    if grep -q "EC2_SSH_KEY" .github/workflows/deploy.yml; then
        echo -e "  ${GREEN}✓${NC} Uses EC2_SSH_KEY secret"
    else
        echo -e "  ${RED}✗${NC} Missing EC2_SSH_KEY reference"
    fi
    
    if grep -q "OPENAI_API_KEY" .github/workflows/deploy.yml; then
        echo -e "  ${GREEN}✓${NC} Uses OPENAI_API_KEY secret"
    else
        echo -e "  ${YELLOW}⚠${NC} OPENAI_API_KEY not referenced (optional)"
    fi
    
    if grep -q "13.134.32.251" .github/workflows/deploy.yml; then
        echo -e "  ${GREEN}✓${NC} Configured for EC2 13.134.32.251"
    else
        echo -e "  ${RED}✗${NC} EC2 IP not configured"
    fi
fi

echo ""

# Check if on git branch
echo "🔀 Checking Git status..."

if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo -e "  ${GREEN}✓${NC} On branch: $BRANCH"
    
    if [ "$BRANCH" != "main" ]; then
        echo -e "  ${YELLOW}⚠${NC} Not on 'main' branch (deployment triggers on main)"
    fi
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "  ${YELLOW}⚠${NC} Uncommitted changes detected"
        echo "      Run: git add . && git commit -m 'Add CI/CD pipeline'"
    else
        echo -e "  ${GREEN}✓${NC} Working directory clean"
    fi
else
    echo -e "  ${RED}✗${NC} Not a git repository"
fi

echo ""

# SSH connectivity check (optional)
echo "🔐 Testing EC2 SSH connectivity..."
echo "   (This will prompt for SSH if key not configured)"

if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@13.134.32.251 'exit' 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} SSH connection successful"
else
    echo -e "  ${YELLOW}⚠${NC} Could not connect to EC2 (configure SSH key)"
    echo "      1. Generate key: ssh-keygen -t rsa -b 4096"
    echo "      2. Copy to EC2: ssh-copy-id ubuntu@13.134.32.251"
    echo "      3. Add to GitHub Secrets as EC2_SSH_KEY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $MISSING -eq 0 ] && [ $ENV_MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ Setup verification complete! Ready to deploy.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Configure GitHub Secrets (see SETUP_CHECKLIST.md)"
    echo "  2. Run: ssh ubuntu@13.134.32.251 'bash -s' < scripts/setup-ec2.sh"
    echo "  3. Run: git push origin main"
    echo "  4. Monitor: https://github.com/YOUR_USERNAME/vogo/actions"
else
    echo -e "${RED}❌ Setup incomplete. Fix the errors above.${NC}"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

