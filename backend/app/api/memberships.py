"""Membership API endpoints."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models import Membership
from app.schemas import MembershipRead

router = APIRouter(prefix="/api/memberships", tags=["memberships"])


@router.get("", response_model=List[MembershipRead])
def list_memberships(db: Session = Depends(get_db)):
    """Get catalog of all available memberships."""
    memberships = db.query(Membership).order_by(Membership.name).all()
    return memberships

