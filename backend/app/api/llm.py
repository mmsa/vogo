"""LLM-powered API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.llm import (
    LLMRecommendationIn,
    LLMRecommendationOut,
    SmartAddIn,
    SmartAddOut
)
from app.services.llm_recommender import (
    generate_llm_recommendations,
    smart_add_check
)

router = APIRouter(prefix="/api/llm", tags=["llm"])


@router.post("/recommendations", response_model=LLMRecommendationOut)
def get_llm_recommendations(
    request: LLMRecommendationIn,
    db: Session = Depends(get_db)
):
    """
    Get LLM-powered recommendations for a user.
    
    This endpoint uses GPT-4o-mini to analyze the user's memberships and benefits,
    providing intelligent recommendations for optimization.
    """
    try:
        context_dict = None
        if request.context:
            context_dict = request.context.model_dump(exclude_none=True)
        
        recommendations, relevant_benefits = generate_llm_recommendations(
            db,
            request.user_id,
            context_dict
        )
        
        return LLMRecommendationOut(
            recommendations=recommendations,
            relevant_benefits=relevant_benefits
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


@router.post("/smart-add", response_model=SmartAddOut)
def smart_add_membership(
    request: SmartAddIn,
    db: Session = Depends(get_db)
):
    """
    Smart check before adding a membership.
    
    Uses LLM to analyze if the candidate membership duplicates existing coverage
    or if the user has better alternatives already.
    """
    try:
        result = smart_add_check(
            db,
            request.user_id,
            request.candidate_membership_slug
        )
        
        return SmartAddOut(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart add check failed: {str(e)}")

