"""Seed script to populate database with initial memberships and benefits."""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal, engine, Base
from app.models import Membership, Benefit, Vendor, User


def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")


def load_seed_data() -> dict:
    """Load seed data from JSON file."""
    seed_file = Path(__file__).parent / "seed_benefits.json"
    with open(seed_file, "r") as f:
        return json.load(f)


def upsert_vendor(db: Session, domain: str, name: str) -> Vendor:
    """Create or update a vendor."""
    vendor = db.query(Vendor).filter(Vendor.domain == domain).first()
    if not vendor:
        vendor = Vendor(domain=domain, name=name)
        db.add(vendor)
        db.flush()
    return vendor


def upsert_membership(
    db: Session,
    name: str,
    provider_slug: str,
    provider_name: str = None,
    plan_name: str = None,
) -> Membership:
    """Create or update a membership."""
    membership = (
        db.query(Membership).filter(Membership.provider_slug == provider_slug).first()
    )

    if membership:
        membership.name = name
        membership.provider_name = provider_name
        membership.plan_name = plan_name
    else:
        membership = Membership(
            name=name,
            provider_slug=provider_slug,
            provider_name=provider_name,
            plan_name=plan_name,
        )
        db.add(membership)
        db.flush()

    return membership


def upsert_benefit(db: Session, membership_id: int, benefit_data: dict):
    """Create or update a benefit."""
    benefit = (
        db.query(Benefit)
        .filter(
            Benefit.membership_id == membership_id,
            Benefit.title == benefit_data["title"],
        )
        .first()
    )

    if benefit:
        # Update existing
        benefit.description = benefit_data.get("description")
        benefit.vendor_domain = benefit_data.get("vendor_domain")
        benefit.category = benefit_data.get("category")
        benefit.source_url = benefit_data.get("source_url")
        benefit.expires_at = benefit_data.get("expires_at")
    else:
        # Create new
        benefit = Benefit(
            membership_id=membership_id,
            title=benefit_data["title"],
            description=benefit_data.get("description"),
            vendor_domain=benefit_data.get("vendor_domain"),
            category=benefit_data.get("category"),
            source_url=benefit_data.get("source_url"),
            expires_at=benefit_data.get("expires_at"),
        )
        db.add(benefit)


def create_test_user(db: Session):
    """Create a test user for development."""
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(email="test@vogo.com")
        db.add(user)
        db.flush()
        print(f"✓ Created test user: {user.email} (ID: {user.id})")


def seed_database():
    """Main seeding function."""
    print("\n🌱 Starting database seed...")

    # Create tables
    create_tables()

    # Load seed data
    print("\nLoading seed data from JSON...")
    data = load_seed_data()

    db = SessionLocal()
    try:
        # Create test user
        create_test_user(db)

        # Process memberships and benefits
        membership_count = 0
        benefit_count = 0
        vendor_domains = set()

        for membership_data in data["memberships"]:
            print(f"\nProcessing: {membership_data['name']}")

            # Extract provider and plan from name
            provider_name = membership_data.get("provider_name")
            plan_name = membership_data.get("plan_name")

            # If not provided, try to parse from name
            if not provider_name or not plan_name:
                parts = membership_data["name"].split()
                if len(parts) >= 2:
                    provider_name = parts[0]
                    plan_name = " ".join(parts[1:])
                else:
                    provider_name = membership_data["name"]
                    plan_name = "Standard"

            # Upsert membership
            membership = upsert_membership(
                db,
                membership_data["name"],
                membership_data["provider_slug"],
                provider_name,
                plan_name,
            )
            membership_count += 1

            # Process benefits
            for benefit_data in membership_data["benefits"]:
                upsert_benefit(db, membership.id, benefit_data)
                benefit_count += 1

                # Track vendor domains
                if benefit_data.get("vendor_domain"):
                    vendor_domains.add(benefit_data["vendor_domain"])

                    # Create vendor if doesn't exist
                    upsert_vendor(
                        db,
                        benefit_data["vendor_domain"],
                        benefit_data.get("title", benefit_data["vendor_domain"]),
                    )

            print(f"  ✓ Added {len(membership_data['benefits'])} benefits")

        # Commit all changes
        db.commit()

        print("\n" + "=" * 50)
        print("✅ Seed completed successfully!")
        print(f"   Memberships: {membership_count}")
        print(f"   Benefits: {benefit_count}")
        print(f"   Vendors: {len(vendor_domains)}")
        print("=" * 50)

    except Exception as e:
        print(f"\n❌ Error during seed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
