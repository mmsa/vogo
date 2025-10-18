#!/bin/bash
# Quick script to load benefits into database

cd /Users/mmsa/Projects/vogo/backend

echo "🔄 Loading benefits from seed file..."
echo ""

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run seed script
python ops/seed.py

echo ""
echo "✅ Done! Now reload the extension popup and you'll see recommendations!"

