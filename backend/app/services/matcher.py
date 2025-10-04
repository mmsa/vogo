"""Benefit matching service."""
from typing import List
from sqlalchemy.orm import Session
from app.models import Benefit, UserMembership


def match_benefits_for_domain(db: Session, user_id: int, domain: str) -> List[Benefit]:
    """
    Match benefits for a given domain for a specific user.
    
    Phase 1: Simple exact/substring matching on vendor_domain.
    TODO Phase 2: Add embedding-based semantic fallback for fuzzy vendor matching.
    
    Args:
        db: Database session
        user_id: User ID to match benefits for
        domain: Domain to match against (e.g., "booking.com")
        
    Returns:
        List of matching benefits from user's memberships
    """
    # Get user's memberships
    user_membership_ids = db.query(UserMembership.membership_id).filter(
        UserMembership.user_id == user_id
    ).all()
    membership_ids = [um[0] for um in user_membership_ids]
    
    if not membership_ids:
        return []
    
    # Phase 1: Exact and substring match on vendor_domain
    domain_lower = domain.lower()
    benefits = db.query(Benefit).filter(
        Benefit.membership_id.in_(membership_ids),
        Benefit.vendor_domain.ilike(f"%{domain_lower}%")
    ).all()
    
    return benefits

