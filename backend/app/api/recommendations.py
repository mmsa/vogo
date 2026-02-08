"""Recommendations API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.auth import get_current_user
from app.models import User
from app.schemas import Recommendation
from app.services.recommender import recommend

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("", response_model=List[Recommendation])
def get_recommendations(
    domain: Optional[str] = Query(None, description="Optional domain for context"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get personalized recommendations for a user."""
    context = {}
    if domain:
        context["domain"] = domain
    
    return recommend(db, user.id, context if context else None)
