"""Membership API endpoints."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, defer
from app.core.db import get_db
from app.models import Membership
from app.schemas import MembershipRead

router = APIRouter(prefix="/api/memberships", tags=["memberships"])


@router.get("", response_model=List[MembershipRead])
def list_memberships(db: Session = Depends(get_db)):
    """Get catalog of all available memberships."""
    # Return only active memberships that are in the catalog
    # This includes both curated memberships and user-discovered memberships
    # Defer plan_tier to avoid errors if column doesn't exist yet (migration not run)
    memberships = (
        db.query(Membership)
        .options(defer(Membership.plan_tier))
        .filter(Membership.status == "active")
        .filter(Membership.is_catalog == True)
        .order_by(Membership.name)
        .all()
    )
    
    # Convert to dict and handle missing plan_tier gracefully
    result = []
    for m in memberships:
        membership_dict = {
            "id": m.id,
            "name": m.name,
            "provider_slug": m.provider_slug,
            "provider_name": m.provider_name,
            "plan_name": m.plan_name,
            "plan_tier": getattr(m, 'plan_tier', None),
            "created_at": m.created_at,
        }
        result.append(MembershipRead(**membership_dict))
    
    return result

