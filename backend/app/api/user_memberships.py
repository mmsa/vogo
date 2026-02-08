"""User membership API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, defer
from app.core.db import get_db
from app.core.auth import get_current_user
from app.models import UserMembership, User, Membership
from app.schemas import UserMembershipCreate, UserMembershipRead

router = APIRouter(prefix="/api/user-memberships", tags=["user-memberships"])


@router.post("", response_model=UserMembershipRead, status_code=201)
def create_user_membership(
    user_membership: UserMembershipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach a membership to a user."""
    if user_membership.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify another user's memberships",
        )
    # Verify user exists
    user = db.query(User).filter(User.id == user_membership.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify membership exists
    # Defer plan_tier to avoid errors if column doesn't exist yet (migration not run)
    membership = (
        db.query(Membership)
        .options(defer(Membership.plan_tier))
        .filter(Membership.id == user_membership.membership_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Check if already exists
    existing = (
        db.query(UserMembership)
        .filter(
            UserMembership.user_id == user_membership.user_id,
            UserMembership.membership_id == user_membership.membership_id,
        )
        .first()
    )
    if existing:
        return existing

    # Create new user membership
    db_user_membership = UserMembership(
        user_id=user_membership.user_id,
        membership_id=user_membership.membership_id,
        notes=user_membership.notes,
    )
    db.add(db_user_membership)
    db.commit()
    db.refresh(db_user_membership)
    return db_user_membership


@router.delete("/{user_id}/{membership_id}", status_code=204)
def delete_user_membership(
    user_id: int,
    membership_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a membership from a user."""
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify another user's memberships",
        )
    # Find the user membership
    user_membership = (
        db.query(UserMembership)
        .filter(
            UserMembership.user_id == user_id,
            UserMembership.membership_id == membership_id,
        )
        .first()
    )

    if not user_membership:
        raise HTTPException(status_code=404, detail="User membership not found")

    # Delete it
    db.delete(user_membership)
    db.commit()

    return None
