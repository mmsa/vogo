"""Admin API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.db import get_db
from app.core.auth import get_current_user, require_role
from app.models import User, Benefit, Membership, UserMembership, AnalyticsEvent
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
    approved_benefits = (
        db.query(Benefit).filter(Benefit.validation_status == "approved").count()
    )
    pending_benefits = (
        db.query(Benefit).filter(Benefit.validation_status == "pending").count()
    )

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
    dependencies=[Depends(require_role("admin"))],
)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all users with counts (admin only). Supports pagination, search, and filtering."""
    query = db.query(User)

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
            )
        )

    # Apply role filter
    if role:
        query = query.filter(User.role == role)

    # Apply active status filter
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()

    # Get counts for each user
    users_with_counts = []
    for user in users:
        # Get membership count
        memberships_count = (
            db.query(UserMembership).filter(UserMembership.user_id == user.id).count()
        )

        # Get benefits count (approved benefits from user's memberships)
        membership_ids_query = db.query(UserMembership.membership_id).filter(
            UserMembership.user_id == user.id
        )
        benefits_count = (
            db.query(Benefit)
            .filter(
                Benefit.membership_id.in_(membership_ids_query),
                Benefit.validation_status == "approved",
            )
            .count()
        )

        users_with_counts.append(
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "memberships_count": memberships_count,
                "benefits_count": benefits_count,
            }
        )

    return {
        "users": users_with_counts,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


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

    # Get user memberships with benefits
    user_memberships = (
        db.query(UserMembership, Membership)
        .join(Membership, UserMembership.membership_id == Membership.id)
        .filter(UserMembership.user_id == user_id)
        .all()
    )

    # Build memberships with their benefits
    memberships_with_benefits = []
    total_benefits = 0

    for um, membership in user_memberships:
        # Get benefits for this membership
        benefits = (
            db.query(Benefit)
            .filter(
                Benefit.membership_id == membership.id,
                Benefit.validation_status == "approved",
            )
            .all()
        )

        total_benefits += len(benefits)

        memberships_with_benefits.append(
            {
                "id": membership.id,
                "name": membership.name,
                "provider_name": membership.provider_name,
                "plan_name": membership.plan_name,
                "provider_slug": membership.provider_slug,
                "plan_slug": membership.plan_slug,
                "added_at": um.created_at.isoformat() if um.created_at else None,
                "benefits": [
                    {
                        "id": benefit.id,
                        "title": benefit.title,
                        "description": benefit.description,
                        "category": benefit.category,
                        "vendor_name": benefit.vendor_name,
                        "vendor_domain": benefit.vendor_domain,
                    }
                    for benefit in benefits
                ],
                "benefits_count": len(benefits),
            }
        )

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "memberships": memberships_with_benefits,
        "memberships_count": len(user_memberships),
        "benefits_count": total_benefits,
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
        membership = (
            db.query(Membership)
            .filter(Membership.provider_slug == membership_data["provider_slug"])
            .first()
        )

        if not membership:
            continue  # Skip if membership doesn't exist

        # Add benefits
        for benefit_data in membership_data.get("benefits", []):
            # Check if benefit already exists
            existing = (
                db.query(Benefit)
                .filter(
                    Benefit.membership_id == membership.id,
                    Benefit.title == benefit_data["title"],
                )
                .first()
            )

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
                    validation_status="approved",
                )
                db.add(new_benefit)
                added_count += 1

    db.commit()

    return {
        "message": f"Loaded seed data: {added_count} new, {updated_count} updated",
        "added": added_count,
        "updated": updated_count,
    }


# ============================================================================
# AFFILIATE MANAGEMENT ENDPOINTS
# ============================================================================


@router.get(
    "/memberships",
    dependencies=[Depends(require_role("admin"))],
)
def list_memberships(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    has_affiliate: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    """List all memberships with affiliate info (admin only)."""
    query = db.query(Membership)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Membership.name.ilike(search_term),
                Membership.provider_name.ilike(search_term),
            )
        )

    # Affiliate filter
    if has_affiliate is True:
        query = query.filter(Membership.affiliate_id.isnot(None))
    elif has_affiliate is False:
        query = query.filter(Membership.affiliate_id.is_(None))

    total = query.count()
    offset = (page - 1) * page_size
    memberships = query.offset(offset).limit(page_size).all()

    return {
        "memberships": [
            {
                "id": m.id,
                "name": m.name,
                "provider_name": m.provider_name,
                "plan_name": m.plan_name,
                "affiliate_id": m.affiliate_id,
                "affiliate_url": m.affiliate_url,
                "commission_type": m.commission_type,
                "partner_name": m.partner_name,
                "commission_notes": m.commission_notes,
            }
            for m in memberships
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch(
    "/memberships/{membership_id}/affiliate",
    dependencies=[Depends(require_role("admin"))],
)
def update_membership_affiliate(
    membership_id: int,
    data: dict,
    db: Session = Depends(get_db),
):
    """Update affiliate information for a membership (admin only)."""
    membership = db.query(Membership).filter(Membership.id == membership_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Update affiliate fields
    if "affiliate_id" in data:
        membership.affiliate_id = data["affiliate_id"]
    if "affiliate_url" in data:
        membership.affiliate_url = data["affiliate_url"]
    if "commission_type" in data:
        membership.commission_type = data["commission_type"]
    if "partner_name" in data:
        membership.partner_name = data["partner_name"]
    if "commission_notes" in data:
        membership.commission_notes = data["commission_notes"]

    db.commit()
    db.refresh(membership)

    return {
        "id": membership.id,
        "name": membership.name,
        "affiliate_id": membership.affiliate_id,
        "affiliate_url": membership.affiliate_url,
        "commission_type": membership.commission_type,
        "partner_name": membership.partner_name,
        "commission_notes": membership.commission_notes,
    }


@router.get(
    "/benefits",
    dependencies=[Depends(require_role("admin"))],
)
def list_benefits(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    membership_id: int | None = Query(None),
    has_affiliate: bool | None = Query(None),
    db: Session = Depends(get_db),
):
    """List all benefits with affiliate info (admin only)."""
    query = db.query(Benefit)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Benefit.title.ilike(search_term),
                Benefit.vendor_name.ilike(search_term),
            )
        )

    # Membership filter
    if membership_id:
        query = query.filter(Benefit.membership_id == membership_id)

    # Affiliate filter
    if has_affiliate is True:
        query = query.filter(Benefit.affiliate_id.isnot(None))
    elif has_affiliate is False:
        query = query.filter(Benefit.affiliate_id.is_(None))

    total = query.count()
    offset = (page - 1) * page_size
    benefits = query.offset(offset).limit(page_size).all()

    # Get membership names
    membership_ids = list(set([b.membership_id for b in benefits]))
    memberships_map = (
        {
            m.id: m.name
            for m in db.query(Membership)
            .filter(Membership.id.in_(membership_ids))
            .all()
        }
        if membership_ids
        else {}
    )

    return {
        "benefits": [
            {
                "id": b.id,
                "title": b.title,
                "membership_id": b.membership_id,
                "membership_name": memberships_map.get(b.membership_id),
                "vendor_name": b.vendor_name,
                "category": b.category,
                "affiliate_id": b.affiliate_id,
                "affiliate_url": b.affiliate_url,
                "commission_type": b.commission_type,
                "partner_name": b.partner_name,
                "commission_notes": b.commission_notes,
            }
            for b in benefits
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch(
    "/benefits/{benefit_id}/affiliate",
    dependencies=[Depends(require_role("admin"))],
)
def update_benefit_affiliate(
    benefit_id: int,
    data: dict,
    db: Session = Depends(get_db),
):
    """Update affiliate information for a benefit (admin only)."""
    benefit = db.query(Benefit).filter(Benefit.id == benefit_id).first()
    if not benefit:
        raise HTTPException(status_code=404, detail="Benefit not found")

    # Update affiliate fields
    if "affiliate_id" in data:
        benefit.affiliate_id = data["affiliate_id"]
    if "affiliate_url" in data:
        benefit.affiliate_url = data["affiliate_url"]
    if "commission_type" in data:
        benefit.commission_type = data["commission_type"]
    if "partner_name" in data:
        benefit.partner_name = data["partner_name"]
    if "commission_notes" in data:
        benefit.commission_notes = data["commission_notes"]

    db.commit()
    db.refresh(benefit)

    return {
        "id": benefit.id,
        "title": benefit.title,
        "affiliate_id": benefit.affiliate_id,
        "affiliate_url": benefit.affiliate_url,
        "commission_type": benefit.commission_type,
        "partner_name": benefit.partner_name,
        "commission_notes": benefit.commission_notes,
    }


# ============================================================================
# ANALYTICS & REPORTING ENDPOINTS
# ============================================================================


@router.get(
    "/analytics/overview",
    dependencies=[Depends(require_role("admin"))],
)
def get_analytics_overview(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Get analytics overview for admin dashboard."""
    start_date = datetime.utcnow() - timedelta(days=days)

    # Total events
    total_events = (
        db.query(AnalyticsEvent).filter(AnalyticsEvent.created_at >= start_date).count()
    )

    # Events by type
    from sqlalchemy import func

    events_by_type = (
        db.query(
            AnalyticsEvent.event_name, func.count(AnalyticsEvent.id).label("count")
        )
        .filter(AnalyticsEvent.created_at >= start_date)
        .group_by(AnalyticsEvent.event_name)
        .all()
    )

    # Daily active users
    daily_active_users = (
        db.query(func.count(func.distinct(AnalyticsEvent.user_id)))
        .filter(
            AnalyticsEvent.created_at >= start_date, AnalyticsEvent.user_id.isnot(None)
        )
        .scalar()
    )

    # Affiliate clicks
    affiliate_clicks = (
        db.query(AnalyticsEvent)
        .filter(
            AnalyticsEvent.event_name == "affiliate_click",
            AnalyticsEvent.created_at >= start_date,
        )
        .count()
    )

    return {
        "period_days": days,
        "total_events": total_events,
        "daily_active_users": daily_active_users,
        "affiliate_clicks": affiliate_clicks,
        "events_by_type": {e.event_name: e.count for e in events_by_type},
    }


@router.get(
    "/analytics/affiliate-report",
    dependencies=[Depends(require_role("admin"))],
)
def get_affiliate_report(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Get affiliate performance report."""
    start_date = datetime.utcnow() - timedelta(days=days)

    # Affiliate clicks by benefit/membership
    from sqlalchemy import func

    affiliate_events = (
        db.query(AnalyticsEvent)
        .filter(
            AnalyticsEvent.event_name == "affiliate_click",
            AnalyticsEvent.created_at >= start_date,
        )
        .all()
    )

    # Group by item
    clicks_by_item = {}
    for event in affiliate_events:
        payload = event.payload or {}
        item_type = payload.get("type", "unknown")  # 'benefit' or 'membership'
        item_id = payload.get("id")
        item_name = payload.get("name", "Unknown")

        key = f"{item_type}_{item_id}"
        if key not in clicks_by_item:
            clicks_by_item[key] = {
                "type": item_type,
                "id": item_id,
                "name": item_name,
                "clicks": 0,
                "unique_users": set(),
            }

        clicks_by_item[key]["clicks"] += 1
        if event.user_id:
            clicks_by_item[key]["unique_users"].add(event.user_id)

    # Format report
    report = []
    for item in clicks_by_item.values():
        report.append(
            {
                "type": item["type"],
                "id": item["id"],
                "name": item["name"],
                "total_clicks": item["clicks"],
                "unique_users": len(item["unique_users"]),
            }
        )

    # Sort by clicks
    report.sort(key=lambda x: x["total_clicks"], reverse=True)

    return {
        "period_days": days,
        "total_clicks": sum(item["total_clicks"] for item in report),
        "items": report[:50],  # Top 50
    }
