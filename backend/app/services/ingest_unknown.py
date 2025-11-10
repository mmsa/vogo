"""Orchestration service for ingesting unknown memberships."""

from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models import Membership, Benefit
from app.services.websearch import search_membership_sites
from app.services.fetcher import fetch_pages
from app.services.llm_extract import extract_benefits_from_pages
from app.services.gpt_websearch import search_with_gpt


def _generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from membership name."""
    import re

    slug = name.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[-\s]+", "-", slug)
    return slug.strip("-")


def ingest_unknown_membership(db: Session, user_id: int, name: str) -> Dict[str, Any]:
    """
    Discover and ingest an unknown membership.

    Steps:
    1. Search web for "{name} membership benefits"
    2. Fetch top results
    3. Extract benefits via LLM
    4. Insert membership as pending
    5. Insert benefits as pending
    6. Return preview

    Args:
        db: Database session
        user_id: User who initiated discovery
        name: Membership name (e.g., "XYZ Club Premium")

    Returns:
        {
            "membership": {...},
            "benefits_preview": [...]
        }
    """
    # Step 1: Check if already exists
    slug = _generate_slug(name)
    existing = db.query(Membership).filter(Membership.provider_slug == slug).first()

    if existing:
        # Return existing with its benefits
        benefits = db.query(Benefit).filter(Benefit.membership_id == existing.id).all()

        # Filter out placeholder benefits and check if real benefits exist
        real_benefits = [
            b for b in benefits if b.title != "Membership added - no benefits found"
        ]
        benefits_found = len(real_benefits) > 0

        # Return all benefits (including placeholders) but mark if real ones exist
        return {
            "membership": {
                "id": existing.id,
                "name": existing.name,
                "provider_slug": existing.provider_slug,
                "status": existing.status,
                "is_catalog": existing.is_catalog,
            },
            "benefits_preview": [
                {
                    "id": b.id,
                    "title": b.title,
                    "description": b.description,
                    "category": b.category,
                    "vendor_domain": b.vendor_domain,
                    "source_url": b.source_url,
                    "validation_status": b.validation_status,
                }
                for b in benefits
            ],
            "benefits_found": benefits_found,  # Flag indicating if real benefits exist
        }

    # Step 2: Use GPT-4o-mini-search-preview to search the web and extract benefits directly
    print(f"🔍 Using GPT-4o-mini-search-preview with built-in web search for '{name}'...")
    from app.services.gpt_websearch import search_and_extract_benefits_with_gpt
    
    extracted_benefits, search_results = search_and_extract_benefits_with_gpt(name)
    
    # If GPT returned benefits directly, use them! Otherwise fall back to fetching pages
    if extracted_benefits:
        print(f"✅ GPT-4o-mini-search-preview found {len(extracted_benefits)} benefits directly from web search!")
    elif search_results:
        # Fallback: GPT didn't extract benefits, but found URLs - fetch pages and extract
        print(f"📥 GPT found {len(search_results)} URLs but no benefits - fetching pages for extraction...")
        urls = [result["url"] for result in search_results]
        pages = fetch_pages(urls)
        print(f"✅ Successfully fetched {len(pages)} pages")
        
        if pages:
            print(f"🤖 Using GPT-4o-mini to extract benefits from fetched pages...")
            try:
                extracted_benefits = extract_benefits_from_pages(name, pages)
                print(f"✅ GPT-4o-mini extracted {len(extracted_benefits)} benefits from pages")
            except Exception as e:
                print(f"❌ Benefit extraction failed: {e}")
                import traceback
                traceback.print_exc()
                extracted_benefits = []
    else:
        print(f"❌ GPT web search found no results for '{name}'")

    # Track if we actually found benefits (not just a placeholder)
    benefits_found = len(extracted_benefits) > 0

    if not extracted_benefits:
        print(f"❌ No benefits found for {name} - cannot create membership without benefits")
        raise ValueError(
            f"Could not find any benefits for '{name}'. "
            "Please ensure the membership name is correct and try again, "
            "or manually add benefits after creating the membership."
        )

    # Step 5: Insert membership - make it catalog-ready immediately
    # Only create membership if we found benefits
    provider_name = name.split()[0] if name.split() else name
    plan_name = " ".join(name.split()[1:]) if len(name.split()) > 1 else "Standard"
    from app.services.membership_tiers import get_plan_tier
    
    membership = Membership(
        name=name,
        provider_slug=slug,
        is_catalog=True,  # Make it available in catalog immediately
        status="active",  # Set as active so user can add it
        discovered_by_user_id=user_id,
        provider_name=provider_name,
        plan_name=plan_name,
        plan_tier=get_plan_tier(provider_name, plan_name),
    )
    db.add(membership)
    db.flush()  # Get ID

    # Step 6: Insert benefits as approved (since membership is active)
    # Ensure all fields are properly set so benefits work across all components/pages/calculations
    benefit_objects = []
    for benefit_data in extracted_benefits:
        # Extract vendor_name from vendor_domain if not provided
        vendor_domain = benefit_data.get("vendor_domain")
        vendor_name = benefit_data.get("vendor_name")

        # If vendor_domain exists but vendor_name doesn't, extract name from domain
        if vendor_domain and not vendor_name:
            # Extract vendor name from domain (e.g., "amazon.co.uk" -> "Amazon")
            domain_parts = vendor_domain.replace("www.", "").split(".")
            if domain_parts:
                vendor_name = domain_parts[0].capitalize()

        # Ensure category is set (default to "other" if missing)
        category = benefit_data.get("category", "other")

        # Ensure description is set (use title if missing)
        description = benefit_data.get("description") or benefit_data.get("title", "")

        benefit = Benefit(
            membership_id=membership.id,
            title=benefit_data["title"],
            description=description,
            category=category,
            vendor_domain=vendor_domain,
            vendor_name=vendor_name,  # Store vendor_name for proper benefit matching
            source_url=benefit_data.get("source_url"),
            validation_status="approved",  # Auto-approve for user-discovered memberships
            source_confidence=0.8,  # Confidence from LLM extraction
            last_checked_at=datetime.utcnow(),
        )
        db.add(benefit)
        benefit_objects.append(benefit)
        print(
            f"  ✅ Stored benefit: {benefit.title} (category: {category}, vendor: {vendor_name or 'N/A'})"
        )

    db.commit()

    # Step 7: Return preview
    return {
        "membership": {
            "id": membership.id,
            "name": membership.name,
            "provider_slug": membership.provider_slug,
            "status": membership.status,
            "is_catalog": membership.is_catalog,
        },
        "benefits_preview": [
            {
                "id": b.id,
                "title": b.title,
                "description": b.description,
                "category": b.category,
                "vendor_domain": b.vendor_domain,
                "source_url": b.source_url,
                "validation_status": b.validation_status,
            }
            for b in benefit_objects
        ],
        "benefits_found": benefits_found,  # Flag indicating if real benefits were discovered
    }
