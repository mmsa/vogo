#!/usr/bin/env python3
"""Add AA membership to admin user for testing"""

import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.db import SessionLocal
from app.models import User, Membership, UserMembership, Benefit


def main():
    db = SessionLocal()

    try:
        # Get admin user
        admin = db.query(User).filter(User.email == "admin@vogoplus.app").first()
        if not admin:
            print("❌ Admin user not found")
            return

        print(f"✅ Found admin user: {admin.email}")

        # Get AA membership
        aa_membership = (
            db.query(Membership)
            .filter(Membership.provider_slug == "aa-membership")
            .first()
        )

        if not aa_membership:
            print("❌ AA membership not found in database")
            print("💡 Run: python ops/seed.py first")
            return

        print(f"✅ Found AA membership: {aa_membership.name}")

        # Check if already assigned
        existing = (
            db.query(UserMembership)
            .filter(
                UserMembership.user_id == admin.id,
                UserMembership.membership_id == aa_membership.id,
            )
            .first()
        )

        if existing:
            print("⚠️  AA membership already assigned to admin")
        else:
            # Assign membership
            user_membership = UserMembership(
                user_id=admin.id,
                membership_id=aa_membership.id,
                start_date=datetime.utcnow(),
                status="active",
            )
            db.add(user_membership)
            db.commit()
            print("✅ Assigned AA membership to admin")

        # Check benefits
        benefits = (
            db.query(Benefit).filter(Benefit.membership_id == aa_membership.id).all()
        )

        approved_count = sum(1 for b in benefits if b.validation_status == "approved")

        print(f"\n📋 AA Membership has {len(benefits)} benefits:")
        print(f"   - {approved_count} approved")
        print(f"   - {len(benefits) - approved_count} not approved")

        if approved_count == 0:
            print("\n⚠️  No approved benefits! Approving all...")
            for benefit in benefits:
                benefit.validation_status = "approved"
            db.commit()
            print(f"✅ Approved {len(benefits)} benefits")

        print("\n🎉 Setup complete! Admin user now has AA membership with benefits.")
        print("📍 Test: Visit www.theaa.com/breakdown-cover/ in the extension")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
