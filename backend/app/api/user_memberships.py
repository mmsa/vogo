"""User membership API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models import UserMembership, User, Membership
from app.schemas import UserMembershipCreate, UserMembershipRead

router = APIRouter(prefix="/api/user-memberships", tags=["user-memberships"])


@router.post("", response_model=UserMembershipRead, status_code=201)
def create_user_membership(
    user_membership: UserMembershipCreate,
    db: Session = Depends(get_db)
):
    """Attach a membership to a user."""
    # Verify user exists
    user = db.query(User).filter(User.id == user_membership.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify membership exists
    membership = db.query(Membership).filter(
        Membership.id == user_membership.membership_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    # Check if already exists
    existing = db.query(UserMembership).filter(
        UserMembership.user_id == user_membership.user_id,
        UserMembership.membership_id == user_membership.membership_id
    ).first()
    if existing:
        return existing
    
    # Create new user membership
    db_user_membership = UserMembership(
        user_id=user_membership.user_id,
        membership_id=user_membership.membership_id,
        notes=user_membership.notes
    )
    db.add(db_user_membership)
    db.commit()
    db.refresh(db_user_membership)
    return db_user_membership

