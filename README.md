# Vogo - Membership Benefits Tracker

A comprehensive membership benefits tracking platform that helps users discover, manage, and optimize their membership perks and subscriptions.

## 📋 Overview

Vogo is a monorepo application consisting of:
- **Backend**: FastAPI + PostgreSQL + SQLAlchemy + OpenAI embeddings
- **Web**: React + Vite + TypeScript + Tailwind CSS
- **Database**: PostgreSQL 16 with Alembic migrations

## 🚀 Quickstart

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Poetry (for Python dependency management) *or pip*

### Using Cursor/VS Code (Recommended)

**One-Click Start:**

1. Open the project in Cursor/VS Code
2. Press `Cmd+Shift+D` (Run & Debug panel)
3. Select **"🎉 Vogo Full Stack"** from dropdown
4. Press `F5` or click the green play button ▶️

That's it! Both backend and frontend will start automatically. See [CURSOR_GUIDE.md](CURSOR_GUIDE.md) for details.

### Manual Setup

### 1. Start the Database

```bash
docker compose -f ops/docker-compose.yml up -d
```

Wait for PostgreSQL to be healthy (about 10 seconds).

### 2. Setup Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies (using poetry)
poetry install

# Activate virtual environment
poetry shell

# Run migrations
alembic upgrade head

# Seed the database
python ops/seed.py

# Start the backend server
uvicorn main:app --reload
```

The backend will be available at `http://localhost:8000`

**Test the API:**
```bash
curl http://localhost:8000/healthz
# Should return: {"status":"ok"}
```

### 3. Setup Web Frontend

Open a new terminal:

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

The web app will be available at `http://localhost:5173`

## 📁 Project Structure

```
vogo/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Config & database
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── ops/
│   │   ├── seed_benefits.json
│   │   └── seed.py
│   ├── alembic/          # Database migrations
│   ├── main.py           # FastAPI app
│   └── pyproject.toml
├── web/
│   ├── src/
│   │   ├── pages/        # React pages
│   │   ├── components/   # Reusable components
│   │   └── lib/          # API client
│   ├── package.json
│   └── vite.config.ts
├── ops/
│   ├── docker-compose.yml
│   └── .env.example
└── README.md
```

## 🗄️ Database Models

- **User**: User accounts
- **Membership**: Available membership programs (Revolut, Lloyds, etc.)
- **Benefit**: Benefits associated with memberships
- **UserMembership**: Links users to their active memberships
- **Vendor**: Vendor domains for benefit matching

## 🔌 API Endpoints

### Health Check
- `GET /healthz` - Health check endpoint

### Users
- `POST /api/users` - Create a new user
- `GET /api/users/{user_id}/benefits` - Get all benefits for a user

### Memberships
- `GET /api/memberships` - Get catalog of all memberships

### User Memberships
- `POST /api/user-memberships` - Attach a membership to a user

### Recommendations
- `GET /api/recommendations?user_id={id}` - Get personalized recommendations
- `GET /api/recommendations?user_id={id}&domain={domain}` - Context-based recommendations

### Check (for browser extension)
- `GET /api/check?vendor={domain}&user_id={id}` - Check benefits for a vendor

## 🧪 Testing the MVP

### Test Scenario 1: Add Memberships and View Benefits

```bash
# 1. Add Revolut Premium for user 1
curl -X POST http://localhost:8000/api/user-memberships \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "membership_id": 1}'

# 2. Add Lloyds Platinum for user 1
curl -X POST http://localhost:8000/api/user-memberships \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "membership_id": 2}'

# 3. Get all benefits for user 1
curl http://localhost:8000/api/users/1/benefits
```

### Test Scenario 2: Get Recommendations

```bash
# Get recommendations for user 1
curl "http://localhost:8000/api/recommendations?user_id=1"

# Should return recommendations about:
# - Duplicate benefits (e.g., travel insurance)
# - Unused high-value perks
# - Optimization opportunities
```

### Test Scenario 3: Check Benefits for a Vendor

```bash
# Check if user has benefits at booking.com
curl "http://localhost:8000/api/check?vendor=booking.com&user_id=1"

# Should return matching benefits and recommendations
```

## 📊 Seed Data

The database is seeded with **11 memberships** and **50+ benefits** including:

- Revolut Premium (lounge access, travel insurance, cashback)
- Lloyds Platinum (travel insurance, AA breakdown, mobile insurance)
- Virgin Media Volt (O2 Priority, speed boost)
- O2 Priority (priority tickets, roaming)
- AA Membership (roadside assistance, hotel discounts)
- Barclays Blue Rewards
- Amazon Prime
- Amex Platinum
- RAC Breakdown Cover
- Spotify Premium Family
- Costco Membership

## 🔧 Database Management

### Create a New Migration

```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations

```bash
alembic upgrade head
```

### Rollback Migration

```bash
alembic downgrade -1
```

### Reset Database

```bash
# Drop and recreate
docker compose -f ops/docker-compose.yml down -v
docker compose -f ops/docker-compose.yml up -d

# Wait for PostgreSQL, then:
cd backend
alembic upgrade head
python ops/seed.py
```

## 🎨 Web Features

- **Dashboard**: Overview of memberships, benefits, and recommendations
- **Memberships**: Browse and add memberships via modal
- **Benefits**: View all benefits grouped by membership
- **Recommendations**: Personalized optimization suggestions

## 🔐 Authentication

**MVP Note**: Currently uses a hardcoded `user_id=1` for development. Production would require:
- JWT authentication
- User registration/login
- Session management

## 📝 Environment Variables

### Backend (.env)

```bash
DATABASE_URL=postgresql+psycopg://vogo:vogo@localhost:5432/vogo
OPENAI_API_KEY=sk-...  # Optional for embeddings
EMBED_MODEL=text-embedding-3-small
```

### Web (.env)

```bash
VITE_API_URL=http://localhost:8000
```

## 🎯 Acceptance Criteria Status

✅ GET /healthz returns 200  
✅ Seed inserts ≥10 memberships / ≥50 benefits  
✅ POST /api/user-memberships adds Revolut + Lloyds  
✅ GET /api/users/1/benefits returns benefits  
✅ GET /api/recommendations returns ≥3 recommendations  
✅ GET /api/check?vendor=booking.com returns relevant benefits  
✅ Web renders lists and recommendation cards  

## 🚧 Phase 2 TODOs

- [ ] Add embedding-based semantic matching in `matcher.py`
- [ ] Add LLM summarizer endpoint for new providers (HTML → JSON)
- [ ] Implement proper authentication and multi-user support
- [ ] Add rate limiting and comprehensive input validation
- [ ] Build browser extension for automatic benefit detection
- [ ] Add benefit usage tracking and analytics
- [ ] Implement notification system for expiring benefits
- [ ] Add cost-benefit analysis for membership optimization

## 🛠️ Development Commands

### Backend

```bash
# Format code
black app/

# Run linter
ruff check app/

# Type checking
mypy app/
```

### Web

```bash
# Lint
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📚 Tech Stack

**Backend:**
- FastAPI - Modern Python web framework
- SQLAlchemy - ORM
- Alembic - Database migrations
- Pydantic - Data validation
- PostgreSQL - Database
- OpenAI - Embeddings (future)

**Frontend:**
- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool
- Tailwind CSS - Styling
- React Router - Navigation

**Infrastructure:**
- Docker Compose - Local development
- PostgreSQL 16 - Database

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

---

Built with ❤️ for better membership management

