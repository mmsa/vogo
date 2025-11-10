#!/usr/bin/env python3
"""Quick script to check if plan_tier migration needs to be run."""

import sys
from sqlalchemy import inspect, text
from app.core.db import engine

def check_column_exists():
    """Check if plan_tier column exists in memberships table."""
    try:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('memberships')]
        
        if 'plan_tier' in columns:
            print("✅ plan_tier column exists in database")
            return True
        else:
            print("❌ plan_tier column does NOT exist in database")
            print("\n💡 SOLUTION: Run the migration:")
            print("   cd backend")
            print("   alembic upgrade head")
            return False
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        print("\n💡 Make sure:")
        print("   1. Database is running")
        print("   2. Database connection is configured correctly")
        return False

if __name__ == "__main__":
    exists = check_column_exists()
    sys.exit(0 if exists else 1)

