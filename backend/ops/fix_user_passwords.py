"""Quick script to update existing users with password hashes."""

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
    db = SessionLocal()

    try:
        # Update admin user
        admin = db.query(User).filter(User.email == "admin@vogoplus.app").first()
        if admin:
            admin.password_hash = hash_password("ChangeMe123!")
            admin.role = UserRole.ADMIN
            admin.is_active = True
            print("✅ Updated admin@vogoplus.app password")
        else:
            # Create admin if doesn't exist
            admin = User(
                email="admin@vogoplus.app",
                password_hash=hash_password("ChangeMe123!"),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin)
            print("✅ Created admin@vogoplus.app")

        # Update test user
        test = db.query(User).filter(User.email == "test@vogoplus.app").first()
        if test:
            test.password_hash = hash_password("TestPass123!")
            test.role = UserRole.USER
            test.is_active = True
            print("✅ Updated test@vogoplus.app password")
        else:
            # Create test user if doesn't exist
            test = User(
                email="test@vogoplus.app",
                password_hash=hash_password("TestPass123!"),
                role=UserRole.USER,
                is_active=True,
            )
            db.add(test)
            print("✅ Created test@vogoplus.app")

        db.commit()
        print("\n🎉 Passwords fixed! You can now login with:")
        print("   📧 test@vogoplus.app / TestPass123!")
        print("   👑 admin@vogoplus.app / ChangeMe123!")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    fix_passwords()
