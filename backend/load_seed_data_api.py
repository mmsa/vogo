#!/usr/bin/env python3
"""Load seed data via API call"""

import requests

API_BASE = "http://localhost:8000"

print("🌱 Loading seed data into database...\n")

# Login as admin
r = requests.post(f"{API_BASE}/api/auth/login",
    json={'email': 'admin@vogoplus.app', 'password': 'ChangeMe123!'})

if r.status_code != 200:
    print(f"❌ Login failed: {r.status_code}")
    exit(1)

token = r.json()['access_token']

# Call a special seed endpoint (we'll create this)
print("📦 Importing benefits from seed file...")
print("   (This may take a moment)")

# For now, let's manually add AA benefits via the API
print("\n✅ Workaround: Adding AA benefits manually via API...\n")

aa_benefits = [
    {
        "title": "Roadside Assistance",
        "description": "24/7 roadside breakdown assistance",
        "category": "breakdown_cover",
        "vendor_domain": "aa.co.uk"
    },
    {
        "title": "Home Breakdown",
        "description": "Assistance if your vehicle breaks down at home",
        "category": "breakdown_cover",
        "vendor_domain": "aa.co.uk"
    },
    {
        "title": "Hotel Discounts",
        "description": "Up to 20% off hotels and accommodation",
        "category": "travel",
        "vendor_domain": "booking.com"
    },
    {
        "title": "Restaurant Discounts",
        "description": "Exclusive dining discounts",
        "category": "food_drink",
        "vendor_domain": "aa.co.uk"
    }
]

# Get AA membership ID
r = requests.get(f"{API_BASE}/api/memberships",
    headers={'Authorization': f'Bearer {token}'})
memberships = r.json()
aa = next((m for m in memberships if 'aa' in m.get('provider_slug', '').lower()), None)

if not aa:
    print("❌ AA membership not found")
    exit(1)

print(f"Found AA Membership (ID: {aa['id']})")
print(f"\nAdding {len(aa_benefits)} benefits...")

# Note: There's no direct API to add benefits, they're typically auto-discovered
# The issue is the seed data hasn't been loaded

print("\n" + "="*60)
print("⚠️  ISSUE IDENTIFIED:")
print("   The seed script needs to run in the backend's Python environment")
print("   But we can't access it from here.")
print("\n💡 SOLUTION:")
print("   1. Stop the backend (Ctrl+C)")
print("   2. Run: cd backend && source .venv/bin/activate") 
print("   3. Run: python ops/seed.py")
print("   4. Restart: uvicorn main:app --reload --port 8000")
print("="*60)

