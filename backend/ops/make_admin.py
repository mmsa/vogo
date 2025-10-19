#!/usr/bin/env python3
"""Quick script to make a user an admin."""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.models.user import User


def main():
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <email>")
        print("\nCurrent users:")
        db = SessionLocal()
        users = db.query(User).all()
        for u in users:
            print(f"  - ID: {u.id}, Email: {u.email}, Role: {u.role}")
        db.close()
        sys.exit(1)

    email = sys.argv[1]
    db = SessionLocal()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"❌ User with email '{email}' not found")
        db.close()
        sys.exit(1)

    user.role = "admin"
    db.commit()

    print(f"✅ User '{email}' (ID: {user.id}) is now an admin!")
    db.close()


if __name__ == "__main__":
    main()
