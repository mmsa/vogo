"""Helper to map LLM outputs to stable benefit IDs."""
from typing import Dict, Tuple
from sqlalchemy.orm import Session
from app.models import Benefit, Membership


def build_benefit_id_map(db: Session) -> Dict[Tuple[str, str], int]:
    """
    Build a mapping of (membership_slug, benefit_title) -> benefit_id.
    
    Args:
        db: Database session
        
    Returns:
        Dictionary mapping (membership_slug, title) to benefit_id
    """
    benefits = db.query(Benefit, Membership).join(
        Membership, Benefit.membership_id == Membership.id
    ).all()
    
    id_map = {}
    for benefit, membership in benefits:
        key = (membership.provider_slug, benefit.title)
        id_map[key] = benefit.id
    
    return id_map


def resolve_benefit_ids(
    db: Session,
    benefit_ids: list[int]
) -> list[int]:
    """
    Validate and filter benefit IDs to only existing ones.
    
    Args:
        db: Database session
        benefit_ids: List of benefit IDs from LLM
        
    Returns:
        List of valid benefit IDs that exist in database
    """
    if not benefit_ids:
        return []
    
    existing_ids = db.query(Benefit.id).filter(
        Benefit.id.in_(benefit_ids)
    ).all()
    
    return [id[0] for id in existing_ids]

