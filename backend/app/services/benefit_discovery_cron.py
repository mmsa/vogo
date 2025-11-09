"""Cron job to discover and add benefits for memberships that have none."""
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Membership, Benefit
from app.services.gpt_websearch import search_and_extract_benefits_with_gpt
from app.services.fetcher import fetch_pages
from app.services.llm_extract import extract_benefits_from_pages


def discover_benefits_for_memberships_without_benefits(
    db: Session,
    limit: int = 10,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Cron job function to discover and add benefits for memberships that have no benefits.
    
    This function:
    1. Finds memberships with no benefits (or only placeholder benefits)
    2. Uses GPT web search to discover benefits
    3. Adds discovered benefits to those memberships
    
    Args:
        db: Database session
        limit: Maximum number of memberships to process per run
        dry_run: If True, only logs what would be done without making changes
        
    Returns:
        Dict with statistics about the run
    """
    print(f"\n{'='*60}")
    print(f"🔍 Starting benefit discovery cron job (limit: {limit}, dry_run: {dry_run})")
    print(f"{'='*60}\n")
    
    # Step 1: Find memberships with no benefits or only placeholder benefits
    print("📋 Finding memberships without benefits...")
    
    # Get all active catalog memberships
    all_memberships = db.query(Membership).filter(
        Membership.status == "active",
        Membership.is_catalog == True
    ).all()
    
    memberships_without_benefits = []
    
    for membership in all_memberships:
        # Count benefits, excluding placeholder benefits
        benefit_count = db.query(func.count(Benefit.id)).filter(
            Benefit.membership_id == membership.id,
            Benefit.title != "Membership added - no benefits found",
            Benefit.validation_status == "approved"
        ).scalar()
        
        if benefit_count == 0:
            memberships_without_benefits.append(membership)
            print(f"  ⚠️  {membership.name} (ID: {membership.id}) - no benefits")
    
    if not memberships_without_benefits:
        print("✅ All memberships have benefits!")
        return {
            "status": "success",
            "message": "All memberships already have benefits",
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "benefits_added": 0
        }
    
    print(f"\n📊 Found {len(memberships_without_benefits)} memberships without benefits")
    print(f"🎯 Processing up to {limit} memberships...\n")
    
    # Step 2: Process each membership (up to limit)
    processed = 0
    successful = 0
    failed = 0
    total_benefits_added = 0
    results = []
    
    for membership in memberships_without_benefits[:limit]:
        processed += 1
        print(f"\n{'─'*60}")
        print(f"[{processed}/{min(len(memberships_without_benefits), limit)}] Processing: {membership.name}")
        print(f"{'─'*60}")
        
        try:
            # Use GPT to search and extract benefits
            extracted_benefits, search_results = search_and_extract_benefits_with_gpt(
                membership.name
            )
            
            # If GPT didn't extract benefits directly, try fetching pages
            if not extracted_benefits and search_results:
                print(f"  📥 GPT found URLs but no benefits - fetching pages...")
                urls = [result["url"] for result in search_results]
                pages = fetch_pages(urls)
                
                if pages:
                    print(f"  🤖 Extracting benefits from {len(pages)} pages...")
                    from app.services.llm_extract import extract_benefits_from_pages
                    extracted_benefits = extract_benefits_from_pages(membership.name, pages)
            
            if not extracted_benefits:
                print(f"  ❌ No benefits found for {membership.name}")
                failed += 1
                results.append({
                    "membership_id": membership.id,
                    "membership_name": membership.name,
                    "status": "failed",
                    "reason": "No benefits found",
                    "benefits_added": 0
                })
                continue
            
            print(f"  ✅ Found {len(extracted_benefits)} benefits")
            
            if dry_run:
                print(f"  🔍 DRY RUN: Would add {len(extracted_benefits)} benefits")
                successful += 1
                total_benefits_added += len(extracted_benefits)
                results.append({
                    "membership_id": membership.id,
                    "membership_name": membership.name,
                    "status": "dry_run",
                    "benefits_found": len(extracted_benefits),
                    "benefits_added": 0
                })
                continue
            
            # Step 3: Add benefits to the membership
            benefits_added = 0
            for benefit_data in extracted_benefits:
                # Check if benefit already exists (by title)
                existing = db.query(Benefit).filter(
                    Benefit.membership_id == membership.id,
                    Benefit.title == benefit_data["title"]
                ).first()
                
                if existing:
                    print(f"    ⏭️  Skipping duplicate: {benefit_data['title']}")
                    continue
                
                # Extract vendor_name from vendor_domain if not provided
                vendor_domain = benefit_data.get("vendor_domain")
                vendor_name = benefit_data.get("vendor_name")
                
                if vendor_domain and not vendor_name:
                    domain_parts = vendor_domain.replace("www.", "").split(".")
                    if domain_parts:
                        vendor_name = domain_parts[0].capitalize()
                
                # Ensure category is set
                category = benefit_data.get("category", "other")
                
                # Ensure description is set
                description = benefit_data.get("description") or benefit_data.get("title", "")
                
                benefit = Benefit(
                    membership_id=membership.id,
                    title=benefit_data["title"],
                    description=description,
                    category=category,
                    vendor_domain=vendor_domain,
                    vendor_name=vendor_name,
                    source_url=benefit_data.get("source_url"),
                    validation_status="approved",  # Auto-approve for cron-discovered benefits
                    source_confidence=0.8,
                    last_checked_at=datetime.utcnow(),
                )
                db.add(benefit)
                benefits_added += 1
                print(f"    ✅ Added: {benefit.title}")
            
            if benefits_added > 0:
                db.commit()
                print(f"  💾 Committed {benefits_added} benefits to database")
                successful += 1
                total_benefits_added += benefits_added
            else:
                print(f"  ⚠️  No new benefits added (all duplicates)")
                failed += 1
            
            results.append({
                "membership_id": membership.id,
                "membership_name": membership.name,
                "status": "success" if benefits_added > 0 else "no_new_benefits",
                "benefits_added": benefits_added
            })
            
        except Exception as e:
            print(f"  ❌ Error processing {membership.name}: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            failed += 1
            results.append({
                "membership_id": membership.id,
                "membership_name": membership.name,
                "status": "error",
                "error": str(e),
                "benefits_added": 0
            })
    
    # Step 4: Return summary
    summary = {
        "status": "completed",
        "processed": processed,
        "successful": successful,
        "failed": failed,
        "benefits_added": total_benefits_added,
        "dry_run": dry_run,
        "results": results
    }
    
    print(f"\n{'='*60}")
    print(f"📊 Cron Job Summary")
    print(f"{'='*60}")
    print(f"✅ Processed: {processed}")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"🎁 Benefits Added: {total_benefits_added}")
    print(f"{'='*60}\n")
    
    return summary

