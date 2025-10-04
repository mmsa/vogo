# Getting Started with Vogo MVP

## Quick Setup (5 minutes)

### Step 1: Start PostgreSQL
```bash
cd /Users/mohamedmostafa/vogo
docker compose -f ops/docker-compose.yml up -d
```

### Step 2: Setup Backend
```bash
cd backend

# Create .env file (if not exists)
echo "DATABASE_URL=postgresql+psycopg://vogo:vogo@localhost:5432/vogo
OPENAI_API_KEY=
EMBED_MODEL=text-embedding-3-small" > .env

# Option A: Using pip (simpler)
pip install -r requirements.txt

# Option B: Using Poetry (recommended)
# poetry install && poetry shell

# Initialize database
alembic upgrade head

# Load seed data (11 memberships, 50+ benefits)
python ops/seed.py

# Start API server
uvicorn main:app --reload
```

Backend running at: http://localhost:8000

### Step 3: Setup Frontend (new terminal)
```bash
cd /Users/mohamedmostafa/vogo/web

npm install
npm run dev
```

Frontend running at: http://localhost:5173

## Test the Application

### Via Web UI
1. Open http://localhost:5173
2. Go to "Memberships" → Click "Add Memberships"
3. Select "Revolut Premium" and "Lloyds Platinum" → Click "Add Selected"
4. Go to "Benefits" to see all your benefits
5. Go to "Recommendations" to see optimization suggestions

### Via API
```bash
# Health check
curl http://localhost:8000/healthz

# Get all memberships
curl http://localhost:8000/api/memberships

# Add Revolut for user 1
curl -X POST http://localhost:8000/api/user-memberships \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "membership_id": 1}'

# Get user benefits
curl http://localhost:8000/api/users/1/benefits

# Get recommendations
curl "http://localhost:8000/api/recommendations?user_id=1"

# Check benefits at booking.com
curl "http://localhost:8000/api/check?vendor=booking.com&user_id=1"
```

## What's Included

### 11 Memberships:
1. Revolut Premium
2. Lloyds Platinum Account
3. Virgin Media Volt
4. O2 Priority
5. AA Membership
6. Barclays Blue Rewards
7. Amazon Prime
8. Amex Platinum
9. RAC Breakdown Cover
10. Spotify Premium Family
11. Costco Membership

### 50+ Benefits including:
- Airport lounge access (LoungeKey)
- Travel insurance
- Breakdown cover
- Mobile/device insurance
- Cashback and discounts
- Entertainment perks
- And more...

## Acceptance Criteria Verification

✅ **GET /healthz → 200**
```bash
curl http://localhost:8000/healthz
```

✅ **Seed inserts ≥10 memberships / ≥50 benefits**
- 11 memberships loaded
- 50+ benefits loaded

✅ **Add memberships for user**
```bash
curl -X POST http://localhost:8000/api/user-memberships \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "membership_id": 1}'
```

✅ **GET /api/users/1/benefits returns benefits**
```bash
curl http://localhost:8000/api/users/1/benefits
```

✅ **GET /api/recommendations returns ≥3 items**
```bash
curl "http://localhost:8000/api/recommendations?user_id=1"
```

✅ **GET /api/check works for vendor domains**
```bash
curl "http://localhost:8000/api/check?vendor=booking.com&user_id=1"
```

✅ **Web renders lists and recommendation cards**
- Visit http://localhost:5173 to verify

## Troubleshooting

### Database connection error
```bash
# Check if PostgreSQL is running
docker ps

# If not, start it
docker compose -f ops/docker-compose.yml up -d
```

### Port already in use
```bash
# Backend (8000)
lsof -ti:8000 | xargs kill -9

# Frontend (5173)
lsof -ti:5173 | xargs kill -9
```

### Reset everything
```bash
# Stop and remove database
docker compose -f ops/docker-compose.yml down -v

# Start fresh
docker compose -f ops/docker-compose.yml up -d
cd backend
alembic upgrade head
python ops/seed.py
```

## Next Steps

1. **Test the recommendation engine** - Add multiple memberships and see duplicate benefit detection
2. **Try the check endpoint** - Test with domains like `booking.com`, `loungekey.com`, `aa.co.uk`
3. **Explore the API** - Visit http://localhost:8000/docs for interactive API documentation
4. **Customize seed data** - Edit `backend/ops/seed_benefits.json` to add more memberships

## Architecture Highlights

- **FastAPI** backend with automatic OpenAPI documentation
- **SQLAlchemy** ORM with Alembic migrations
- **Pydantic** schemas for type-safe APIs
- **React + TypeScript** frontend with Tailwind CSS
- **PostgreSQL 16** database
- Phase-1 exact matching with TODO for embedding-based semantic search

Enjoy exploring Vogo! 🚀

