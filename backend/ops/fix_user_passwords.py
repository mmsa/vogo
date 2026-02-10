"""Quick script to update existing users with password hashes."""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import User
from app.models.user import UserRole


def fix_passwords():
    """Update existing users with proper password hashes."""
    admin_email = os.getenv("ADMIN_EMAIL", "admin@vogoplus.app")
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    test_email = os.getenv("TEST_USER_EMAIL", "")
    test_password = os.getenv("TEST_USER_PASSWORD", "")

    if not admin_password:
        print("❌ ADMIN_PASSWORD is required to update admin credentials.")
        return

    db = SessionLocal()

    try:
        # Update admin user
        admin = db.query(User).filter(User.email == admin_email).first()
        if admin:
            admin.password_hash = hash_password(admin_password)
            admin.role = UserRole.ADMIN
            admin.is_active = True
            print(f"✅ Updated {admin_email} password")
        else:
            # Create admin if doesn't exist
            admin = User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin)
            print(f"✅ Created {admin_email}")

        # Update test user
        if test_email and test_password:
            test = db.query(User).filter(User.email == test_email).first()
            if test:
                test.password_hash = hash_password(test_password)
                test.role = UserRole.USER
                test.is_active = True
                print(f"✅ Updated {test_email} password")
            else:
                # Create test user if doesn't exist
                test = User(
                    email=test_email,
                    password_hash=hash_password(test_password),
                    role=UserRole.USER,
                    is_active=True,
                )
                db.add(test)
                print(f"✅ Created {test_email}")
        else:
            print("ℹ️  Skipping test user update (set TEST_USER_EMAIL and TEST_USER_PASSWORD to enable).")

        db.commit()
        print("\n🎉 Passwords updated.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    fix_passwords()
