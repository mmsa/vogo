"""Benefits API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas import BenefitRead
from app.models import Benefit

router = APIRouter(prefix="/api/benefits", tags=["benefits"])


@router.get("/{benefit_id}", response_model=BenefitRead)
def get_benefit(benefit_id: int, db: Session = Depends(get_db)):
    """Get a single benefit by ID."""
    benefit = db.query(Benefit).filter(Benefit.id == benefit_id).first()

    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit not found")

    return benefit


@router.get("", response_model=List[BenefitRead])
def get_benefits(
    ids: Optional[List[int]] = Query(None, description="Benefit IDs to fetch"),
    membership_id: Optional[int] = Query(None, description="Membership ID to filter by"),
    db: Session = Depends(get_db),
):
    """Get multiple benefits by IDs or by membership ID."""
    query = db.query(Benefit)
    
    if ids:
        query = query.filter(Benefit.id.in_(ids))
    elif membership_id:
        query = query.filter(Benefit.membership_id == membership_id)
    else:
        raise HTTPException(
            status_code=400,
            detail="Either 'ids' or 'membership_id' query parameter is required"
        )
    
    benefits = query.all()
    return benefits
