"""LLM-powered recommendation service using OpenAI."""

import json
from typing import List, Dict, Any, Optional, Tuple
from openai import OpenAI
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.core.config import settings
from app.models import Benefit, UserMembership, Membership, Recommendation
from app.schemas.llm import RecommendationDTO, LLMRecommendationOut
from app.schemas.benefit import BenefitRead
from app.services.llm_prompts import RECO_PROMPT, ADD_FLOW_PROMPT
from app.services.id_map import resolve_benefit_ids


client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None


def _generate_mock_recommendations(
    user_data: Dict[str, Any], prompt: str
) -> Dict[str, Any]:
    """
    Generate mock recommendations when OpenAI API key is not configured.
    Shows enhanced, personalized examples of what the AI recommendations would look like.
    """
    benefits = user_data.get("benefits", [])
    memberships = user_data.get("user_memberships", [])

    # Check if this is for smart-add flow
    if "candidate" in user_data:
        return {
            "decision": "add",
            "explanation": "Mock mode: OpenAI API key not configured. Add your key to enable smart membership analysis.",
            "alternatives": [],
            "impacted_benefits": [],
        }

    # Generate personalized mock recommendations based on actual user data
    recommendations = []
    relevant_benefit_ids = []

    # Find overlaps by category
    category_groups = {}
    for benefit in benefits:
        cat = benefit.get("category", "unknown")
        if cat not in category_groups:
            category_groups[cat] = []
        category_groups[cat].append(benefit)

    # Create recommendations for duplicates
    for category, items in category_groups.items():
        if len(items) > 1:
            membership_names = list(
                set(
                    [
                        b.get("membership_slug", "").replace("-", " ").title()
                        for b in items
                    ]
                )
            )
            benefit_titles = [b.get("title", "") for b in items[:2]]

            recommendations.append(
                {
                    "title": f"Save £{len(items) * 80}/year by consolidating duplicate {category.replace('_', ' ')} coverage",
                    "rationale": f"You have {len(items)} {category.replace('_', ' ')} benefits across {', '.join(membership_names[:2])}. {benefit_titles[0]} and {benefit_titles[1] if len(benefit_titles) > 1 else 'another benefit'} provide similar coverage. Keep the one with better value and cancel the duplicate to save money immediately. Review your memberships to identify which offers superior coverage for your needs.",
                    "estimated_saving_min": len(items) * 8000,  # £80 in pence
                    "estimated_saving_max": len(items) * 12000,  # £120 in pence
                    "action_url": items[0].get("source_url"),
                    "membership_slug": items[0].get("membership_slug"),
                    "benefit_match_ids": [b.get("id") for b in items],
                    "kind": "overlap",
                }
            )
            relevant_benefit_ids.extend([b.get("id") for b in items])

    # Add unused benefit recommendations
    for benefit in benefits[:3]:  # Top 3 benefits
        if benefit.get("category") in ["travel_insurance", "lounge_access", "cashback"]:
            membership_name = (
                benefit.get("membership_slug", "").replace("-", " ").title()
            )
            recommendations.append(
                {
                    "title": f"Unlock £{150}/year in unused {benefit.get('title', 'benefits')} from your {membership_name}",
                    "rationale": f"Your {membership_name} membership includes {benefit.get('title')} worth approximately £150/year that many members forget to use. {benefit.get('description', 'This valuable perk')} is ready to activate. Log into your account today and set up this benefit - it takes just 2 minutes and could save you significantly on your next use. Don't let this value go to waste!",
                    "estimated_saving_min": 10000,  # £100
                    "estimated_saving_max": 20000,  # £200
                    "action_url": benefit.get("source_url"),
                    "membership_slug": benefit.get("membership_slug"),
                    "benefit_match_ids": [benefit.get("id")],
                    "kind": "unused",
                }
            )
            relevant_benefit_ids.append(benefit.get("id"))

    # Add a bundle/switch recommendation
    if len(memberships) > 2:
        recommendations.append(
            {
                "title": f"Consider consolidating to a premium membership - potential £{200}/year savings",
                "rationale": f"You're currently managing {len(memberships)} separate memberships ({', '.join([m.get('name', '') for m in memberships[:3]])}). Premium all-in-one memberships like Revolut Metal or Amex Platinum often bundle these benefits at better value. Compare the total annual cost of your current memberships (typically £{len(memberships) * 60}/year) against a premium option. You might get more benefits for less money while simplifying your life to just one card.",
                "estimated_saving_min": 15000,
                "estimated_saving_max": 30000,
                "action_url": None,
                "membership_slug": None,
                "benefit_match_ids": [],
                "kind": "bundle",
            }
        )

    # Add a quick win tip
    if benefits:
        recommendations.append(
            {
                "title": "Quick Win: Set calendar reminders for your membership renewals",
                "rationale": f"With {len(memberships)} active memberships, it's easy to miss renewal dates and pay for services you no longer need. Set up calendar alerts 30 days before each renewal to review if you're still getting value. This simple 5-minute task can save you hundreds by catching unused memberships before auto-renewal. Studies show 42% of people forget about subscriptions they no longer use.",
                "estimated_saving_min": 5000,
                "estimated_saving_max": 15000,
                "action_url": None,
                "membership_slug": None,
                "benefit_match_ids": [],
                "kind": "tip",
            }
        )

    return {
        "recommendations": recommendations[:5],  # Limit to 5
        "relevant_benefits": list(set(relevant_benefit_ids))[:10],
    }


def _call_openai(
    prompt: str,
    user_data: Dict[str, Any],
    model: str = "gpt-4o-mini",  # Can use "gpt-3.5-turbo" for 10x faster, cheaper responses
    max_retries: int = 2,
) -> Optional[Dict[str, Any]]:
    """
    Call OpenAI API with retry logic.

    Args:
        prompt: System prompt template
        user_data: Data to inject into prompt
        model: OpenAI model to use
        max_retries: Number of retries on failure

    Returns:
        Parsed JSON response or None on failure
    """
    if not client:
        # Return mock recommendations when no API key is configured
        return _generate_mock_recommendations(user_data, prompt)

    formatted_prompt = prompt.format(user_data=json.dumps(user_data, indent=2))

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that returns only valid JSON.",
                    },
                    {"role": "user", "content": formatted_prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                continue

            # Parse JSON
            result = json.loads(content)
            return result

        except (json.JSONDecodeError, Exception) as e:
            print(f"OpenAI call attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                return None
            continue

    return None


def generate_llm_recommendations(
    db: Session, user_id: int, context: Optional[Dict[str, Any]] = None
) -> Tuple[List[RecommendationDTO], List[BenefitRead]]:
    """
    Generate LLM-powered recommendations for a user.

    Args:
        db: Database session
        user_id: User ID
        context: Optional context (domain, category)

    Returns:
        Tuple of (recommendations, relevant_benefits)
    """
    # Get user's memberships
    user_memberships = (
        db.query(UserMembership, Membership)
        .join(Membership, UserMembership.membership_id == Membership.id)
        .filter(UserMembership.user_id == user_id)
        .all()
    )

    if not user_memberships:
        return [], []

    # Get all APPROVED benefits for user's memberships
    # Exclude pending/rejected benefits from recommendations
    membership_ids = [um.membership_id for um, _ in user_memberships]
    benefits = (
        db.query(Benefit, Membership)
        .join(Membership, Benefit.membership_id == Membership.id)
        .filter(
            Benefit.membership_id.in_(membership_ids),
            Benefit.validation_status == "approved"
        )
        .all()
    )

    # Filter by context if provided
    filtered_benefits = benefits
    if context:
        if context.get("domain"):
            domain = context["domain"].lower()
            filtered_benefits = [
                (b, m)
                for b, m in benefits
                if b.vendor_domain and domain in b.vendor_domain.lower()
            ]
        elif context.get("category"):
            category = context["category"].lower()
            filtered_benefits = [
                (b, m)
                for b, m in benefits
                if b.category and category in b.category.lower()
            ]

    # Build payload for LLM
    user_data = {
        "user_memberships": [
            {"slug": m.provider_slug, "name": m.name} for _, m in user_memberships
        ],
        "benefits": [
            {
                "id": b.id,
                "membership_slug": m.provider_slug,
                "title": b.title,
                "description": b.description,
                "category": b.category,
                "vendor_domain": b.vendor_domain,
                "source_url": b.source_url,
            }
            for b, m in benefits
        ],
        "context": context or {},
    }

    # Call OpenAI
    llm_response = _call_openai(RECO_PROMPT, user_data)

    if not llm_response:
        return [], []

    # Parse and validate recommendations
    recommendations = []
    for rec_data in llm_response.get("recommendations", []):
        try:
            # Validate benefit IDs
            benefit_ids = resolve_benefit_ids(db, rec_data.get("benefit_match_ids", []))
            rec_data["benefit_match_ids"] = benefit_ids

            rec = RecommendationDTO(**rec_data)
            recommendations.append(rec)
        except ValidationError as e:
            print(f"Failed to validate recommendation: {e}")
            continue

    # Get relevant benefits
    relevant_benefit_ids = resolve_benefit_ids(
        db, llm_response.get("relevant_benefits", [])
    )

    relevant_benefits = []
    if relevant_benefit_ids:
        benefit_objects = (
            db.query(Benefit).filter(Benefit.id.in_(relevant_benefit_ids)).all()
        )
        relevant_benefits = [BenefitRead.model_validate(b) for b in benefit_objects]

    return recommendations, relevant_benefits


def smart_add_check(db: Session, user_id: int, candidate_slug: str) -> Dict[str, Any]:
    """
    Check if adding a membership is smart given user's current memberships.

    Args:
        db: Database session
        user_id: User ID
        candidate_slug: Membership slug being considered

    Returns:
        Dictionary with decision, explanation, alternatives, impacted benefits
    """
    # Get candidate membership
    candidate = (
        db.query(Membership).filter(Membership.provider_slug == candidate_slug).first()
    )

    if not candidate:
        return {
            "decision": "add",
            "explanation": "Membership not found",
            "alternatives": [],
            "impacted_benefits": [],
        }

    # Get candidate's benefits
    candidate_benefits = (
        db.query(Benefit).filter(Benefit.membership_id == candidate.id).all()
    )

    # Get user's current memberships and benefits
    user_memberships = (
        db.query(UserMembership, Membership)
        .join(Membership, UserMembership.membership_id == Membership.id)
        .filter(UserMembership.user_id == user_id)
        .all()
    )

    membership_ids = [um.membership_id for um, _ in user_memberships]
    user_benefits = (
        db.query(Benefit, Membership)
        .join(Membership, Benefit.membership_id == Membership.id)
        .filter(Benefit.membership_id.in_(membership_ids))
        .all()
    )

    # Build payload for LLM
    input_data = {
        "candidate": {
            "slug": candidate.provider_slug,
            "name": candidate.name,
            "benefits": [
                {
                    "id": b.id,
                    "title": b.title,
                    "description": b.description,
                    "category": b.category,
                }
                for b in candidate_benefits
            ],
        },
        "user_memberships": [
            {"slug": m.provider_slug, "name": m.name} for _, m in user_memberships
        ],
        "benefits": [
            {
                "id": b.id,
                "membership_slug": m.provider_slug,
                "title": b.title,
                "description": b.description,
                "category": b.category,
                "vendor_domain": b.vendor_domain,
            }
            for b, m in user_benefits
        ],
    }

    # Call OpenAI
    llm_response = _call_openai(ADD_FLOW_PROMPT, input_data)

    if not llm_response:
        return {
            "decision": "add",
            "explanation": "Could not analyze membership",
            "alternatives": [],
            "impacted_benefits": [],
        }

    # Validate and resolve benefit IDs
    impacted_ids = resolve_benefit_ids(db, llm_response.get("impacted_benefits", []))

    impacted_benefits = []
    if impacted_ids:
        benefit_objects = db.query(Benefit).filter(Benefit.id.in_(impacted_ids)).all()
        impacted_benefits = [BenefitRead.model_validate(b) for b in benefit_objects]

    return {
        "decision": llm_response.get("decision", "add"),
        "explanation": llm_response.get("explanation", ""),
        "alternatives": llm_response.get("alternatives", []),
        "impacted_benefits": impacted_benefits,
    }
