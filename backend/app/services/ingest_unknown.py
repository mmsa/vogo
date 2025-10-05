"""Orchestration service for ingesting unknown memberships."""
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models import Membership, Benefit
from app.services.websearch import search_membership_sites
from app.services.fetcher import fetch_pages
from app.services.llm_extract import extract_benefits_from_pages


def _generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from membership name."""
    import re
    slug = name.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')


def ingest_unknown_membership(
    db: Session,
    user_id: int,
    name: str
) -> Dict[str, Any]:
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
    existing = db.query(Membership).filter(
        Membership.provider_slug == slug
    ).first()
    
    if existing:
        # Return existing with its benefits
        benefits = db.query(Benefit).filter(
            Benefit.membership_id == existing.id
        ).all()
        
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
            ]
        }
    
    # Step 2: Search web
    query = f"{name} membership benefits perks"
    print(f"Searching for: {query}")
    search_results = search_membership_sites(query, limit=5)
    
    if not search_results:
        raise ValueError("No search results found for this membership")
    
    # Step 3: Fetch pages
    urls = [result["url"] for result in search_results]
    print(f"Fetching {len(urls)} pages...")
    pages = fetch_pages(urls)
    
    if not pages:
        raise ValueError("Could not fetch any pages for analysis")
    
    # Step 4: Extract benefits
    print(f"Extracting benefits from {len(pages)} pages...")
    extracted_benefits = extract_benefits_from_pages(name, pages)
    
    if not extracted_benefits:
        raise ValueError("Could not extract any benefits from the pages")
    
    # Step 5: Insert membership as pending
    membership = Membership(
        name=name,
        provider_slug=slug,
        is_catalog=False,
        status="pending",
        discovered_by_user_id=user_id,
        provider_name=name.split()[0] if name.split() else name,
        plan_name=" ".join(name.split()[1:]) if len(name.split()) > 1 else "Standard",
    )
    db.add(membership)
    db.flush()  # Get ID
    
    # Step 6: Insert benefits as pending
    benefit_objects = []
    for benefit_data in extracted_benefits:
        benefit = Benefit(
            membership_id=membership.id,
            title=benefit_data["title"],
            description=benefit_data["description"],
            category=benefit_data["category"],
            vendor_domain=benefit_data.get("vendor_domain"),
            source_url=benefit_data["source_url"],
            validation_status="pending",
            source_confidence=0.8,  # Placeholder - could be enhanced
            last_checked_at=datetime.utcnow(),
        )
        db.add(benefit)
        benefit_objects.append(benefit)
    
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
        ]
    }

