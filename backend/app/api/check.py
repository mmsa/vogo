"""Check API endpoint for browser extension."""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.matcher import match_benefits_for_domain
from app.services.recommender import recommend
from app.schemas import BenefitRead

router = APIRouter(prefix="/api/check", tags=["check"])


@router.get("")
def check_benefits(
    vendor: str = Query(..., description="Vendor domain to check"),
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Check if user has benefits for a vendor domain.
    Used by browser extension to show relevant benefits on vendor sites.
    """
    # Get matching benefits
    benefits = match_benefits_for_domain(db, user_id, vendor)
    
    # Get minimal recommendations with domain context
    recommendations = recommend(db, user_id, {"domain": vendor})
    
    return {
        "vendor": vendor,
        "user_id": user_id,
        "has_benefits": len(benefits) > 0,
        "benefits": [BenefitRead.model_validate(b) for b in benefits],
        "recommendations": recommendations[:3]  # Limit to top 3
    }

