"""Admin API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.db import get_db
from app.core.auth import get_current_user, require_role
from app.models import User, Benefit, Membership, UserMembership
from app.schemas import UserRead, AdminUserUpdate, UserListResponse
import json
from pathlib import Path
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get platform statistics for admin dashboard."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_memberships = db.query(Membership).count()
    total_benefits = db.query(Benefit).count()
    approved_benefits = db.query(Benefit).filter(Benefit.validation_status == "approved").count()
    pending_benefits = db.query(Benefit).filter(Benefit.validation_status == "pending").count()
    
    # Recent users (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_users = db.query(User).filter(User.created_at >= seven_days_ago).count()
    
    # User memberships count
    user_memberships_count = db.query(UserMembership).count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "recent": recent_users,
        },
        "memberships": {
            "total": total_memberships,
            "user_subscriptions": user_memberships_count,
        },
        "benefits": {
            "total": total_benefits,
            "approved": approved_benefits,
            "pending": pending_benefits,
        },
    }


@router.get(
    "/users",
    response_model=UserListResponse,
    dependencies=[Depends(require_role("admin"))],
)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all users (admin only). Supports pagination and search."""
    query = db.query(User)

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
            )
        )

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()

    return UserListResponse(
        users=users,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/users/{user_id}",
    dependencies=[Depends(require_role("admin"))],
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed user information including memberships and benefits (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Get user memberships
    user_memberships = db.query(UserMembership, Membership).join(
        Membership, UserMembership.membership_id == Membership.id
    ).filter(UserMembership.user_id == user_id).all()
    
    # Get benefits count
    membership_ids = [um.membership_id for um, _ in user_memberships]
    benefits_count = db.query(Benefit).filter(
        Benefit.membership_id.in_(membership_ids) if membership_ids else False,
        Benefit.validation_status == "approved"
    ).count()
    
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "memberships": [
            {
                "id": membership.id,
                "name": membership.name,
                "provider_name": membership.provider_name,
                "plan_name": membership.plan_name,
            }
            for _, membership in user_memberships
        ],
        "memberships_count": len(user_memberships),
        "benefits_count": benefits_count,
    }


@router.patch(
    "/users/{user_id}",
    response_model=UserRead,
    dependencies=[Depends(require_role("admin"))],
)
def update_user(
    user_id: int,
    user_update: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user role or active status (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Don't allow admin to deactivate themselves
    if user.id == current_user.id and user_update.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    # Apply updates
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.is_active is not None:
        user.is_active = user_update.is_active

    db.commit()
    db.refresh(user)

    return user


@router.post("/benefits/approve-all")
def approve_all_benefits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve all pending benefits (temporary dev endpoint)."""
    pending_benefits = (
        db.query(Benefit).filter(Benefit.validation_status != "approved").all()
    )

    count = len(pending_benefits)

    for benefit in pending_benefits:
        benefit.validation_status = "approved"

    db.commit()

    return {"message": f"Approved {count} benefits", "count": count}


@router.post("/seed-benefits")
def seed_benefits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Load benefits from seed file (temporary dev endpoint)."""
    seed_file = Path(__file__).parent.parent.parent / "ops" / "seed_benefits.json"
    
    if not seed_file.exists():
        raise HTTPException(status_code=404, detail="Seed file not found")
    
    with open(seed_file, "r") as f:
        seed_data = json.load(f)
    
    added_count = 0
    updated_count = 0
    
    for membership_data in seed_data.get("memberships", []):
        # Find membership by slug
        membership = db.query(Membership).filter(
            Membership.provider_slug == membership_data["provider_slug"]
        ).first()
        
        if not membership:
            continue  # Skip if membership doesn't exist
        
        # Add benefits
        for benefit_data in membership_data.get("benefits", []):
            # Check if benefit already exists
            existing = db.query(Benefit).filter(
                Benefit.membership_id == membership.id,
                Benefit.title == benefit_data["title"]
            ).first()
            
            if existing:
                # Update existing
                existing.description = benefit_data.get("description")
                existing.category = benefit_data.get("category")
                existing.vendor_domain = benefit_data.get("vendor_domain")
                existing.validation_status = "approved"
                updated_count += 1
            else:
                # Create new
                new_benefit = Benefit(
                    membership_id=membership.id,
                    title=benefit_data["title"],
                    description=benefit_data.get("description"),
                    category=benefit_data.get("category"),
                    vendor_domain=benefit_data.get("vendor_domain"),
                    source_url=benefit_data.get("source_url"),
                    validation_status="approved"
                )
                db.add(new_benefit)
                added_count += 1
    
    db.commit()
    
    return {
        "message": f"Loaded seed data: {added_count} new, {updated_count} updated",
        "added": added_count,
        "updated": updated_count
    }
