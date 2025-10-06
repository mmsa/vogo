"""GPT-powered membership validation service."""
import json
from typing import Dict, Any, Optional
from openai import OpenAI
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Membership

# Initialize OpenAI client
client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None


VALIDATION_PROMPT = """You are an expert at identifying and validating membership programs.

Your task is to determine if a membership name provided by a user is:
1. A real, legitimate membership program
2. Specific enough to research benefits
3. Worth adding to a membership tracking system

RULES:
- Return "valid" if it's a real membership program (credit cards, bank accounts, loyalty programs, subscriptions)
- Return "invalid" if it's too vague, not a membership, or nonsensical
- Return "exists" if you can identify it as an existing well-known membership
- Provide suggestions for clarification if the name is ambiguous
- Normalize the name to a standard format

EXAMPLES:

Input: "amex platinum"
Output: {
  "status": "valid",
  "normalized_name": "American Express Platinum Card",
  "provider": "American Express",
  "plan": "Platinum",
  "confidence": 0.95,
  "reason": "Well-known credit card with extensive benefits",
  "suggestions": []
}

Input: "revolut"
Output: {
  "status": "ambiguous",
  "normalized_name": "Revolut",
  "provider": "Revolut",
  "plan": null,
  "confidence": 0.5,
  "reason": "Revolut has multiple tiers. Please specify which plan.",
  "suggestions": ["Revolut Standard", "Revolut Premium", "Revolut Metal", "Revolut Ultra"]
}

Input: "my bank account"
Output: {
  "status": "invalid",
  "normalized_name": null,
  "provider": null,
  "plan": null,
  "confidence": 0.0,
  "reason": "Too vague. Please specify the bank name and account type.",
  "suggestions": ["Lloyds Platinum Account", "Barclays Premier Account", "HSBC Premier"]
}

Input: "xyz123 fake membership"
Output: {
  "status": "invalid",
  "normalized_name": null,
  "provider": null,
  "plan": null,
  "confidence": 0.0,
  "reason": "This does not appear to be a real membership program.",
  "suggestions": []
}

Input: "chase sapphire reserve"
Output: {
  "status": "valid",
  "normalized_name": "Chase Sapphire Reserve",
  "provider": "Chase",
  "plan": "Sapphire Reserve",
  "confidence": 0.95,
  "reason": "Premium travel rewards credit card with extensive benefits",
  "suggestions": []
}

Respond ONLY with valid JSON following this schema."""


class ValidationResult(BaseModel):
    """Validation result from GPT."""
    status: str  # "valid", "invalid", "ambiguous", "exists"
    normalized_name: Optional[str] = None
    provider: Optional[str] = None
    plan: Optional[str] = None
    confidence: float
    reason: str
    suggestions: list[str] = []


def validate_membership_with_gpt(
    db: Session,
    membership_name: str,
    max_retries: int = 2
) -> Dict[str, Any]:
    """
    Validate a membership name using GPT.
    
    Args:
        db: Database session
        membership_name: Name provided by user
        max_retries: Number of retries on validation failure
        
    Returns:
        {
            "status": "valid" | "invalid" | "ambiguous" | "exists",
            "normalized_name": str or None,
            "provider": str or None,
            "plan": str or None,
            "confidence": float,
            "reason": str,
            "suggestions": list[str],
            "existing_membership": {...} or None  # If found in DB
        }
    """
    if not client:
        raise ValueError("OpenAI API key not configured")
    
    # First, check if it exists in our database
    search_term = membership_name.lower().strip()
    existing = db.query(Membership).filter(
        Membership.name.ilike(f"%{search_term}%")
    ).first()
    
    if existing:
        return {
            "status": "exists",
            "normalized_name": existing.name,
            "provider": existing.provider_name,
            "plan": existing.plan_name,
            "confidence": 1.0,
            "reason": f"This membership already exists in our catalog: {existing.name}",
            "suggestions": [],
            "existing_membership": {
                "id": existing.id,
                "name": existing.name,
                "provider_slug": existing.provider_slug,
                "is_catalog": existing.is_catalog,
                "status": existing.status,
            }
        }
    
    # Use GPT to validate
    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": VALIDATION_PROMPT},
                    {"role": "user", "content": f"Validate this membership: {membership_name}"}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if not content:
                continue
            
            # Parse and validate
            raw_data = json.loads(content)
            result = ValidationResult(**raw_data)
            
            # Convert to dict and add None for existing_membership
            result_dict = result.model_dump()
            result_dict["existing_membership"] = None
            
            return result_dict
            
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Validation attempt {attempt + 1} failed: {e}")
            if attempt == max_retries:
                # Return invalid on final failure
                return {
                    "status": "invalid",
                    "normalized_name": None,
                    "provider": None,
                    "plan": None,
                    "confidence": 0.0,
                    "reason": "Failed to validate membership. Please try again.",
                    "suggestions": [],
                    "existing_membership": None
                }
            continue
        except Exception as e:
            print(f"Validation error: {e}")
            return {
                "status": "invalid",
                "normalized_name": None,
                "provider": None,
                "plan": None,
                "confidence": 0.0,
                "reason": f"Error validating membership: {str(e)}",
                "suggestions": [],
                "existing_membership": None
            }
    
    return {
        "status": "invalid",
        "normalized_name": None,
        "provider": None,
        "plan": None,
        "confidence": 0.0,
        "reason": "Failed to validate membership",
        "suggestions": [],
        "existing_membership": None
    }

