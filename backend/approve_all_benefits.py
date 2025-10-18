#!/usr/bin/env python3
"""Approve all pending benefits so AI can use them"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.db import SessionLocal
from app.models import Benefit


def main():
    db = SessionLocal()

    try:
        # Get all benefits
        all_benefits = db.query(Benefit).all()
        pending = [b for b in all_benefits if b.validation_status != "approved"]

        print(f"📊 Benefits status:")
        print(f"   Total: {len(all_benefits)}")
        print(f"   Pending: {len(pending)}")
        print(f"   Approved: {len(all_benefits) - len(pending)}")

        if pending:
            print(f"\n✨ Approving {len(pending)} pending benefits...")
            for benefit in pending:
                benefit.validation_status = "approved"

            db.commit()
            print(f"✅ All benefits approved!")
            print("\n🎉 Extension will now show recommendations!")
        else:
            print("\n✅ All benefits already approved!")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
