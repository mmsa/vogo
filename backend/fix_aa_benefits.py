#!/usr/bin/env python3
"""
Quick fix: Add approved AA benefits directly to the database
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.db import SessionLocal
from app.models.benefit import Benefit
from app.models.membership import Membership


def main():
    db = SessionLocal()

    # Find AA membership
    aa = (
        db.query(Membership).filter(Membership.provider_slug == "aa-membership").first()
    )

    if not aa:
        print("❌ AA Membership not found!")
        return

    print(f"✅ Found AA Membership (ID: {aa.id})")

    # Check existing benefits
    existing = db.query(Benefit).filter(Benefit.membership_id == aa.id).all()
    print(f"📊 Existing benefits: {len(existing)}")

    for b in existing:
        print(f"   - {b.title} (status: {b.validation_status})")

    # AA Benefits data
    aa_benefits = [
        {
            "title": "Roadside Breakdown Assistance",
            "description": "24/7 roadside assistance across the UK, including breakdowns at home",
            "category": "breakdown_cover",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "UK Breakdown Cover",
            "description": "Expert patrols to fix 4 out of 5 breakdowns at the roadside",
            "category": "breakdown_cover",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "Home Start Service",
            "description": "Assistance if your vehicle won't start at home or within a quarter mile",
            "category": "breakdown_cover",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "National Recovery",
            "description": "Transport you, your vehicle and up to 7 passengers to any UK destination",
            "category": "breakdown_cover",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "Relay Service",
            "description": "Alternative transport if your vehicle can't be fixed at the roadside",
            "category": "breakdown_cover",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "European Breakdown Cover",
            "description": "24/7 breakdown assistance across Europe with English-speaking support",
            "category": "travel",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "Car Insurance Discounts",
            "description": "Exclusive discounts on AA car insurance for members",
            "category": "insurance",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "Hotel Discounts",
            "description": "Up to 20% off hotel bookings through AA Travel",
            "category": "travel",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "Route Planning",
            "description": "Free online route planner with traffic updates and journey times",
            "category": "other",
            "vendor_domain": "theaa.com",
        },
        {
            "title": "Member Rewards",
            "description": "Access to exclusive member deals and discounts with partner brands",
            "category": "retail",
            "vendor_domain": "theaa.com",
        },
    ]

    added = 0
    updated = 0

    for benefit_data in aa_benefits:
        # Check if it already exists
        existing_benefit = (
            db.query(Benefit)
            .filter(
                Benefit.membership_id == aa.id, Benefit.title == benefit_data["title"]
            )
            .first()
        )

        if existing_benefit:
            # Update to approved
            existing_benefit.validation_status = "approved"
            existing_benefit.description = benefit_data["description"]
            existing_benefit.category = benefit_data["category"]
            existing_benefit.vendor_domain = benefit_data["vendor_domain"]
            updated += 1
            print(f"   ✏️  Updated: {benefit_data['title']}")
        else:
            # Create new approved benefit
            new_benefit = Benefit(
                membership_id=aa.id,
                title=benefit_data["title"],
                description=benefit_data["description"],
                category=benefit_data["category"],
                vendor_domain=benefit_data["vendor_domain"],
                source_url="https://www.theaa.com/breakdown-cover",
                validation_status="approved",
            )
            db.add(new_benefit)
            added += 1
            print(f"   ➕ Added: {benefit_data['title']}")

    db.commit()

    print(f"\n✅ DONE!")
    print(f"   Added: {added}")
    print(f"   Updated: {updated}")
    print(f"\n🎉 AA now has {added + updated} approved benefits!")

    # Verify
    final_count = (
        db.query(Benefit)
        .filter(Benefit.membership_id == aa.id, Benefit.validation_status == "approved")
        .count()
    )

    print(f"   Verified: {final_count} approved AA benefits in database")


if __name__ == "__main__":
    main()
