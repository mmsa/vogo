"""Recommendation service for benefit optimization."""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Benefit, UserMembership, Membership
from app.schemas import Recommendation


def recommend(
    db: Session,
    user_id: int,
    context: Optional[Dict[str, Any]] = None
) -> List[Recommendation]:
    """
    Generate benefit recommendations for a user.
    
    Phase 1 rules:
    - Dedupe overlapping benefits (e.g., multiple travel insurance)
    - Surface unused perks
    - Suggest bundle/switch opportunities for duplicate categories
    
    Args:
        db: Database session
        user_id: User ID to generate recommendations for
        context: Optional context dict (e.g., {"domain": "booking.com"})
        
    Returns:
        List of recommendations with title, rationale, savings, etc.
    """
    recommendations = []
    
    # Get user's memberships and benefits
    user_memberships = db.query(UserMembership).filter(
        UserMembership.user_id == user_id
    ).all()
    
    if not user_memberships:
        return recommendations
    
    membership_ids = [um.membership_id for um in user_memberships]
    
    # Get all APPROVED benefits for user's memberships with membership info
    # Exclude pending/rejected benefits from recommendations
    benefits = db.query(Benefit, Membership).join(
        Membership, Benefit.membership_id == Membership.id
    ).filter(
        Benefit.membership_id.in_(membership_ids),
        Benefit.validation_status == "approved"
    ).all()
    
    # Group by category to find overlaps
    category_benefits = {}
    for benefit, membership in benefits:
        if benefit.category:
            if benefit.category not in category_benefits:
                category_benefits[benefit.category] = []
            category_benefits[benefit.category].append((benefit, membership))
    
    # Find duplicate categories (potential optimization)
    for category, items in category_benefits.items():
        if len(items) > 1:
            memberships_str = ", ".join(set(m.name for _, m in items))
            recommendations.append(Recommendation(
                title=f"Duplicate {category} Benefits",
                rationale=f"You have {len(items)} benefits in {category} across {memberships_str}. "
                          f"Review to see if you're using all of them or if consolidation could save money.",
                estimated_saving="£50-150/year",
                action_url=None,
                membership=memberships_str,
                benefit_id=items[0][0].id
            ))
    
    # Highlight high-value unused perks
    high_value_categories = ["travel_insurance", "lounge_access", "device_insurance", "breakdown_cover"]
    for benefit, membership in benefits:
        if benefit.category in high_value_categories:
            recommendations.append(Recommendation(
                title=f"Unused {membership.name} Perk: {benefit.title}",
                rationale=f"Your {membership.name} membership includes {benefit.title}. "
                          f"Make sure you're taking advantage of this benefit!",
                estimated_saving="Up to £200/year",
                action_url=benefit.source_url,
                membership=membership.name,
                benefit_id=benefit.id
            ))
    
    # Context-based recommendations
    if context and context.get("domain"):
        domain = context["domain"]
        matching_benefits = [
            (b, m) for b, m in benefits 
            if b.vendor_domain and domain.lower() in b.vendor_domain.lower()
        ]
        
        for benefit, membership in matching_benefits:
            recommendations.append(Recommendation(
                title=f"Use Your {membership.name} Benefit at {domain}",
                rationale=f"You have access to {benefit.title} through {membership.name}.",
                estimated_saving="Varies",
                action_url=benefit.source_url,
                membership=membership.name,
                benefit_id=benefit.id
            ))
    
    # Limit to avoid overwhelming users
    return recommendations[:10]

