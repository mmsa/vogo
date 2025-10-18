"""User API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.auth import get_current_user
from app.models import User, Benefit, UserMembership, Membership
from app.schemas import UserCreate, UserRead, BenefitRead

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's information."""
    return current_user


@router.post("", response_model=UserRead, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = User(email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/{user_id}/benefits", response_model=List[BenefitRead])
def get_user_benefits(user_id: int, db: Session = Depends(get_db)):
    """Get all benefits for a user based on their memberships."""
    # Get user's membership IDs
    user_memberships = (
        db.query(UserMembership).filter(UserMembership.user_id == user_id).all()
    )

    if not user_memberships:
        return []

    membership_ids = [um.membership_id for um in user_memberships]

    # Get all benefits for these memberships
    benefits = db.query(Benefit).filter(Benefit.membership_id.in_(membership_ids)).all()

    return benefits
