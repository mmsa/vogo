"""Smart Add / Discovery API endpoints for memberships."""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.auth import get_current_user, require_admin
from app.models import User
from app.models import Membership, Benefit
from app.services.ingest_unknown import ingest_unknown_membership


router = APIRouter(prefix="/api/memberships", tags=["memberships-discover"])


# Request/Response schemas
class DiscoverRequest(BaseModel):
    user_id: int
    name: str  # Membership name to discover


class BenefitPreview(BaseModel):
    id: int | None = None
    title: str
    description: str | None
    category: str | None
    vendor_domain: str | None
    source_url: str | None
    validation_status: str


class MembershipPreview(BaseModel):
    id: int
    name: str
    provider_slug: str
    status: str
    is_catalog: bool


class DiscoverResponse(BaseModel):
    membership: MembershipPreview
    benefits_preview: List[BenefitPreview]
    benefits_found: bool = True  # Whether actual benefits were discovered (vs placeholder)


class BenefitDecision(BaseModel):
    benefit_id: int
    decision: str  # "approve" or "reject"


class ValidateRequest(BaseModel):
    membership_id: int
    decision: str  # "approve" or "reject"
    benefit_decisions: List[BenefitDecision] | None = None


class PendingMembershipOut(BaseModel):
    id: int
    name: str
    provider_slug: str
    status: str
    discovered_by_user_id: int | None
    pending_benefits_count: int
    created_at: str


@router.post("/discover", response_model=DiscoverResponse)
def discover_membership(
    request: DiscoverRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Smart Add: Discover an unknown membership.
    
    Searches the web, extracts benefits via GPT, and saves as pending.
    """
    try:
        if request.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot discover memberships for another user",
            )

        result = ingest_unknown_membership(
            db,
            current_user.id,
            request.name
        )
        
        return DiscoverResponse(
            membership=MembershipPreview(**result["membership"]),
            benefits_preview=[
                BenefitPreview(**b) for b in result["benefits_preview"]
            ],
            benefits_found=result.get("benefits_found", True)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Discovery failed: {str(e)}"
        )


@router.post("/validate", status_code=200)
def validate_membership(
    request: ValidateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Validate a pending membership (admin/owner action).
    
    Approves or rejects the membership and its benefits.
    """
    # Get the membership
    membership = db.query(Membership).filter(
        Membership.id == request.membership_id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    # Update membership status
    if request.decision == "approve":
        membership.status = "active"
        membership.is_catalog = True  # Add to catalog
    elif request.decision == "reject":
        membership.status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid decision")
    
    # Update benefit statuses
    if request.benefit_decisions:
        for benefit_decision in request.benefit_decisions:
            benefit = db.query(Benefit).filter(
                Benefit.id == benefit_decision.benefit_id
            ).first()
            
            if benefit and benefit.membership_id == membership.id:
                if benefit_decision.decision == "approve":
                    benefit.validation_status = "approved"
                elif benefit_decision.decision == "reject":
                    benefit.validation_status = "rejected"
    else:
        # If no specific benefit decisions, approve all if membership approved
        if request.decision == "approve":
            benefits = db.query(Benefit).filter(
                Benefit.membership_id == membership.id
            ).all()
            for benefit in benefits:
                benefit.validation_status = "approved"
    
    db.commit()
    
    return {
        "status": "success",
        "membership_id": membership.id,
        "decision": request.decision
    }


@router.get("/pending", response_model=List[PendingMembershipOut])
def get_pending_memberships(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Get all pending memberships awaiting validation.
    """
    pending = db.query(Membership).filter(
        Membership.status == "pending"
    ).all()
    
    result = []
    for membership in pending:
        # Count pending benefits
        pending_benefits_count = db.query(Benefit).filter(
            Benefit.membership_id == membership.id,
            Benefit.validation_status == "pending"
        ).count()
        
        result.append(PendingMembershipOut(
            id=membership.id,
            name=membership.name,
            provider_slug=membership.provider_slug,
            status=membership.status,
            discovered_by_user_id=membership.discovered_by_user_id,
            pending_benefits_count=pending_benefits_count,
            created_at=membership.created_at.isoformat()
        ))
    
    return result
