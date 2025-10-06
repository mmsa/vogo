"""Benefits API endpoints."""

from typing import List
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
    ids: List[int] = Query(..., description="Benefit IDs to fetch"),
    db: Session = Depends(get_db),
):
    """Get multiple benefits by IDs."""
    benefits = db.query(Benefit).filter(Benefit.id.in_(ids)).all()
    return benefits
