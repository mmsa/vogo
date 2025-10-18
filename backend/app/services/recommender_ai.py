"""AI-powered recommendation service."""

import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.services.ai_client import _call, parse_json_response
from app.services.ai_prompts import RECO_PROMPT, QA_PROMPT
from app.models import Benefit, UserMembership, Membership
from app.core.db import get_db


def build_user_payload(
    db: Session, user_id: int, context: Optional[Dict[str, Any]] = None
) -> Dict:
    """
    Build payload with user's memberships and benefits.

    Args:
        db: Database session
        user_id: User ID
        context: Optional context (domain, category, etc.)

    Returns:
        Dictionary with user data for AI
    """
    # Get user's memberships
    user_memberships = db.query(UserMembership).filter_by(user_id=user_id).all()
    membership_ids = [um.membership_id for um in user_memberships]

    if not membership_ids:
        return {"user_memberships": [], "benefits": [], "context": context or {}}

    # Get membership details
    memberships_map = {}
    for membership_id in membership_ids:
        membership = db.query(Membership).get(membership_id)
        if membership:
            memberships_map[membership_id] = membership

    # Get approved benefits only
    benefits_query = db.query(Benefit).filter(
        Benefit.membership_id.in_(membership_ids),
        Benefit.validation_status == "approved",
    )

    benefits = benefits_query.all()

    # Format benefits for AI
    benefits_data = []
    for benefit in benefits:
        membership = memberships_map.get(benefit.membership_id)
        if membership:
            benefits_data.append(
                {
                    "id": benefit.id,
                    "membership_slug": membership.provider_slug,
                    "membership_name": membership.name,
                    "title": benefit.title,
                    "description": benefit.description or "",
                    "category": benefit.category or "other",
                    "vendor_domain": benefit.vendor_domain,
                    "source_url": benefit.source_url,
                }
            )

    # Format memberships
    memberships_data = [
        {"slug": m.provider_slug, "name": m.name} for m in memberships_map.values()
    ]

    return {
        "user_memberships": memberships_data,
        "benefits": benefits_data,
        "context": context or {},
    }


def generate_recommendations(
    db: Session, user_id: int, model: str, context: Optional[Dict[str, Any]] = None
) -> Dict:
    """
    Generate AI-powered recommendations.

    Args:
        db: Database session
        user_id: User ID
        model: OpenAI model to use
        context: Optional context for recommendations

    Returns:
        Dictionary with recommendations and relevant benefits
    """
    # Build payload
    payload = build_user_payload(db, user_id, context)

    # If no benefits, return empty
    if not payload["benefits"]:
        return {"recommendations": [], "relevant_benefits": []}

    # Create messages
    messages = [
        {"role": "system", "content": RECO_PROMPT},
        {"role": "user", "content": json.dumps(payload)},
    ]

    try:
        # Call AI
        raw_response = _call(model, messages, max_tokens=1500)

        # Parse response
        data = parse_json_response(raw_response)

        # Validate and limit
        recommendations = data.get("recommendations", [])[:10]
        relevant_benefits = data.get("relevant_benefits", [])[:30]

        return {
            "recommendations": recommendations,
            "relevant_benefits": relevant_benefits,
        }

    except Exception as e:
        print(f"Recommendation generation failed: {e}")
        return {"recommendations": [], "relevant_benefits": []}


def answer_question(db: Session, user_id: int, question: str, model: str) -> str:
    """
    Answer user question about their benefits using AI.

    Args:
        db: Database session
        user_id: User ID
        question: User's question
        model: OpenAI model to use

    Returns:
        Answer string
    """
    # Build payload
    payload = build_user_payload(db, user_id, None)

    # Add question to payload
    qa_payload = {"question": question, "data": payload}

    # Create messages
    messages = [
        {"role": "system", "content": QA_PROMPT},
        {"role": "user", "content": json.dumps(qa_payload)},
    ]

    try:
        # Call AI
        raw_response = _call(model, messages, max_tokens=300, temperature=0.3)

        # Parse response
        data = parse_json_response(raw_response)

        return data.get("answer", "I couldn't process that question. Please try again.")

    except Exception as e:
        print(f"Q&A failed: {e}")
        return "I encountered an error processing your question. Please try again."
