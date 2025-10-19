"""Temporary development endpoint to manage admin roles."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/dev", tags=["dev"])


@router.get("/whoami")
def whoami(
    current_user: User = Depends(get_current_user),
):
    """Check current user's details including role."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": (
            current_user.created_at.isoformat() if current_user.created_at else None
        ),
        "message": f"You are logged in as {current_user.email} with role '{current_user.role}'",
    }


@router.post("/make-me-admin")
def make_me_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Make the current user an admin (dev only)."""
    if current_user.role == "admin":
        return {
            "message": "You are already an admin!",
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "role": current_user.role,
            },
        }

    # Update role
    current_user.role = "admin"
    db.commit()
    db.refresh(current_user)

    return {
        "message": f"✅ {current_user.email} is now an admin! Please log out and log back in to see the Admin link.",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
        },
    }


@router.get("/all-users")
def list_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all users and their roles (for debugging)."""
    users = db.query(User).all()

    return {
        "current_user_id": current_user.id,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "is_you": u.id == current_user.id,
            }
            for u in users
        ],
    }
