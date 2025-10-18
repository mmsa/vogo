# Environment Variables Template

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/vogo

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
EMBED_MODEL=text-embedding-3-small
MODEL_RECO=gpt-4o-mini
MODEL_EXTRACT=gpt-4o-mini

# Search & AI Configuration
SEARCH_PROVIDER=duckduckgo
AI_MAX_PAGES=5

# JWT Authentication Configuration
JWT_SECRET=your-secret-key-min-32-chars-use-openssl-rand-hex-32
ACCESS_TTL_MIN=30
REFRESH_TTL_DAYS=30

# Admin User Configuration (for initial seed)
ADMIN_EMAIL=admin@vogo.app
ADMIN_PASSWORD=ChangeMe123!

# Optional: Search API (for Smart Add feature)
# SEARCH_API_KEY=your-bing-or-serp-api-key
```

## Generating a Strong JWT Secret

Run this command to generate a secure JWT secret:
```bash
openssl rand -hex 32
```

## Default Credentials (after running seed script)

- **Admin User**: 
  - Email: `admin@vogo.app` (or as configured in ADMIN_EMAIL)
  - Password: `ChangeMe123!` (or as configured in ADMIN_PASSWORD)

- **Test User**:
  - Email: `test@vogo.app`
  - Password: `TestPass123!`

**⚠️ IMPORTANT**: Change these passwords in production!

