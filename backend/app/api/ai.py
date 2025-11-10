"""AI-powered API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.auth import get_current_user
from app.schemas.ai import (
    AIContext,
    AIRecsResponse,
    DiscoverResponse,
    BenefitOut,
    QAResponse,
)
from app.services import websearch, extractor, recommender_ai
from app.core.config import settings
from app.models import Membership, Benefit, User

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/recommendations", response_model=AIRecsResponse)
def ai_recommendations(
    ctx: AIContext,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Generate AI-powered recommendations for a user.

    Analyzes user's memberships and benefits to find:
    - Overlapping benefits (duplicates)
    - Unused perks
    - Potential switches or bundles
    - Money-saving opportunities
    """
    try:
        context_dict = ctx.model_dump(exclude_none=True)
        data = recommender_ai.generate_recommendations(
            db=db,
            user_id=user.id,
            model=settings.model_reco,
            context=context_dict if context_dict else None,
        )
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"AI recommendations error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to generate recommendations"
        )


@router.post("/discover", response_model=DiscoverResponse)
def discover_membership(
    ctx: AIContext,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Discover a new membership by searching the web and extracting benefits.

    1. Validates membership name (min 3 chars)
    2. Searches web for benefits
    3. Extracts benefits using AI
    4. Creates pending membership and benefits in database
    5. Returns preview
    """
    name = ctx.candidate_membership_name

    # Validate input
    if not name:
        raise HTTPException(
            status_code=400, detail="candidate_membership_name is required"
        )

    if len(name.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Membership name must be at least 3 characters"
        )

    name = name.strip()

    try:
        # Search for benefits
        search_query = f"{name} membership benefits perks"
        urls = websearch.search_urls(search_query, limit=settings.ai_max_pages)

        if not urls:
            raise HTTPException(
                status_code=404, detail="No information found for this membership"
            )

        # Fetch pages
        pages = [websearch.fetch_text(url) for url in urls]
        pages = [p for p in pages if p["text"]]  # Filter out failed fetches

        if not pages:
            raise HTTPException(
                status_code=404,
                detail="Could not fetch information for this membership",
            )

        # Extract benefits
        benefits_data = extractor.extract_benefits(name, pages, settings.model_extract)

        if not benefits_data:
            raise HTTPException(
                status_code=404, detail="No benefits could be extracted"
            )

        # Create membership (pending status)
        provider_slug = name.lower().replace(" ", "-").replace("'", "")

        # Check if already exists
        existing = db.query(Membership).filter_by(provider_slug=provider_slug).first()
        if existing:
            membership = existing
        else:
            from app.services.membership_tiers import get_plan_tier
            # Parse provider and plan from name
            parts = name.split()
            provider_name = parts[0] if parts else name
            plan_name = " ".join(parts[1:]) if len(parts) > 1 else "Standard"
            
            membership = Membership(
                name=name,
                provider_slug=provider_slug,
                is_catalog=False,
                status="pending",
                provider_name=provider_name,
                plan_name=plan_name,
                plan_tier=get_plan_tier(provider_name, plan_name),
            )
            db.add(membership)
            db.commit()
            db.refresh(membership)

        # Create benefits (pending status)
        benefit_outs = []
        for benefit_data in benefits_data:
            # Check if benefit already exists
            existing_benefit = (
                db.query(Benefit)
                .filter_by(membership_id=membership.id, title=benefit_data["title"])
                .first()
            )

            if existing_benefit:
                benefit_outs.append(
                    BenefitOut(
                        id=existing_benefit.id,
                        membership_slug=membership.provider_slug,
                        title=existing_benefit.title,
                        description=existing_benefit.description or "",
                        category=existing_benefit.category or "other",
                        vendor_domain=existing_benefit.vendor_domain,
                        source_url=existing_benefit.source_url,
                        validation_status=existing_benefit.validation_status,
                    )
                )
            else:
                benefit = Benefit(
                    membership_id=membership.id,
                    title=benefit_data["title"],
                    description=benefit_data["description"],
                    category=benefit_data["category"],
                    vendor_domain=benefit_data.get("vendor_domain"),
                    source_url=benefit_data.get("source_url"),
                    validation_status="pending",
                )
                db.add(benefit)
                db.flush()

                benefit_outs.append(
                    BenefitOut(
                        id=benefit.id,
                        membership_slug=membership.provider_slug,
                        title=benefit.title,
                        description=benefit.description or "",
                        category=benefit.category or "other",
                        vendor_domain=benefit.vendor_domain,
                        source_url=benefit.source_url,
                        validation_status="pending",
                    )
                )

        db.commit()

        return DiscoverResponse(membership_name=membership.name, benefits=benefit_outs)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Discovery error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to discover membership")


@router.post("/qa", response_model=QAResponse)
def ai_qa(
    ctx: AIContext,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Answer user questions about their memberships and benefits.

    Uses AI to provide concise, grounded answers based only on
    the user's actual membership data.
    """
    question = ctx.question

    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    if len(question.strip()) < 3:
        raise HTTPException(
            status_code=400, detail="Question must be at least 3 characters"
        )

    try:
        answer = recommender_ai.answer_question(
            db=db, user_id=user.id, question=question.strip(), model=settings.model_reco
        )

        return QAResponse(answer=answer)

    except Exception as e:
        print(f"Q&A error: {e}")
        raise HTTPException(status_code=500, detail="Failed to answer question")
