"""Semantic check API endpoint for browser extension."""
from typing import Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl

from app.core.db import get_db
from app.core.auth import get_current_user
from app.models import User, UserMembership, Benefit, Membership
from app.services.page_scraper import scrape_page_metadata
from app.services.semantic_matcher import find_semantic_matches, generate_user_message


router = APIRouter(prefix="/api/check-semantic", tags=["check-semantic"])


class SemanticCheckRequest(BaseModel):
    """Request model for semantic check."""
    url: str
    use_cache: bool = True


@router.post("")
async def check_semantic(
    request: SemanticCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Semantic check: Scrape page, match benefits using embeddings, generate AI message.
    
    This is the SMART version that:
    1. Scrapes page metadata
    2. Uses semantic search to find matching benefits
    3. Generates user-friendly message with mini LLM
    
    Cost: ~$0.0006 per unique URL (cached for 10 minutes)
    """
    try:
        # Step 1: Scrape page metadata
        metadata = await scrape_page_metadata(request.url)
        
        if "error" in metadata:
            # Return graceful fallback
            return {
                "success": False,
                "error": "Could not access page",
                "url": request.url,
                "domain": metadata.get("domain", ""),
                "has_matches": False,
                "message": "Unable to check benefits for this page"
            }
        
        # Step 2: Get user's benefits
        user_memberships = db.query(UserMembership).filter(
            UserMembership.user_id == current_user.id
        ).all()
        
        if not user_memberships:
            return {
                "success": True,
                "url": request.url,
                "domain": metadata.get("domain", ""),
                "has_matches": False,
                "message": "Add memberships to see relevant benefits",
                "matches": []
            }
        
        membership_ids = [um.membership_id for um in user_memberships]
        
        # Get approved benefits with membership info
        benefits_with_membership = []
        for membership_id in membership_ids:
            membership = db.query(Membership).get(membership_id)
            if membership:
                benefits = db.query(Benefit).filter(
                    Benefit.membership_id == membership_id,
                    Benefit.validation_status == "approved"
                ).all()
                
                for benefit in benefits:
                    benefits_with_membership.append((benefit, membership))
        
        if not benefits_with_membership:
            return {
                "success": True,
                "url": request.url,
                "domain": metadata.get("domain", ""),
                "has_matches": False,
                "message": "No benefits available yet",
                "matches": []
            }
        
        # Step 3: Semantic matching with embeddings
        semantic_matches = await find_semantic_matches(
            metadata,
            benefits_with_membership,
            top_k=5,
            threshold=0.6  # 60% similarity minimum
        )
        
        # Step 4: Generate user message with mini LLM
        result = await generate_user_message(metadata, semantic_matches)
        
        # Add metadata to response
        result.update({
            "success": True,
            "url": request.url,
            "domain": metadata.get("domain", ""),
            "page_title": metadata.get("title", ""),
        })
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Semantic check failed: {str(e)}"
        )


@router.get("/status")
def get_status():
    """Get semantic matching system status."""
    from app.services.semantic_matcher import embedding_cache, match_cache
    
    return {
        "status": "operational",
        "embedding_cache_size": len(embedding_cache),
        "match_cache_size": len(match_cache),
        "embedding_cache_max": embedding_cache.maxsize,
        "match_cache_max": match_cache.maxsize
    }

