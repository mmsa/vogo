"""Membership validation API endpoints."""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.auth import get_current_user
from app.models import User
from app.services.llm_validate_membership import validate_membership_with_gpt


router = APIRouter(prefix="/api/memberships", tags=["memberships-validate"])


class ValidateRequest(BaseModel):
    """Request to validate a membership name."""
    name: str
    user_id: int


class ValidateResponse(BaseModel):
    """Response from membership validation."""
    status: str  # "valid", "invalid", "ambiguous", "exists"
    normalized_name: str | None = None
    provider: str | None = None
    plan: str | None = None
    confidence: float
    reason: str
    suggestions: list[str] = []
    existing_membership: Dict[str, Any] | None = None


@router.post("/validate-name", response_model=ValidateResponse)
def validate_membership_name(
    request: ValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validate a membership name before discovery.
    
    Uses GPT to:
    1. Check if it's a real membership
    2. Normalize the name
    3. Check if it already exists in our DB
    4. Provide suggestions if ambiguous
    """
    try:
        if request.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot validate memberships for another user",
            )

        result = validate_membership_with_gpt(
            db,
            request.name
        )
        
        return ValidateResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )
