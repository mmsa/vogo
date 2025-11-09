#!/usr/bin/env python3
"""
Standalone cron job script to discover benefits for memberships without benefits.

This script can be run directly or scheduled via cron:
    # Run daily at 2 AM
    0 2 * * * cd /path/to/vogo/backend && /path/to/python scripts/discover_benefits_cron.py

Or run manually:
    python scripts/discover_benefits_cron.py
    python scripts/discover_benefits_cron.py --limit 20
    python scripts/discover_benefits_cron.py --dry-run
"""

import sys
import os
import argparse
from pathlib import Path

# Add parent directory to path so we can import app modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.db import SessionLocal
from app.services.benefit_discovery_cron import discover_benefits_for_memberships_without_benefits


def main():
    parser = argparse.ArgumentParser(
        description="Discover and add benefits for memberships without benefits"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of memberships to process per run (default: 10)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate without making changes to database"
    )
    
    args = parser.parse_args()
    
    # Create database session
    db = SessionLocal()
    
    try:
        result = discover_benefits_for_memberships_without_benefits(
            db=db,
            limit=args.limit,
            dry_run=args.dry_run
        )
        
        # Exit with appropriate code
        if result["failed"] > 0 and result["successful"] == 0:
            sys.exit(1)  # All failed
        elif result["successful"] > 0:
            sys.exit(0)  # At least some succeeded
        else:
            sys.exit(0)  # Nothing to process
            
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

