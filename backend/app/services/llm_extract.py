"""LLM-based benefit extraction from web pages."""
import json
from typing import List, Dict, Any
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings
from app.core.openai_client import get_openai_client


client = get_openai_client()


# Pydantic models for validation
class BenefitDTO(BaseModel):
    """Extracted benefit data."""
    title: str = Field(..., max_length=80, description="Short benefit title")
    description: str = Field(..., max_length=220, description="Factual description")
    category: str = Field(
        ...,
        pattern="^(travel|insurance|breakdown_cover|retail|dining|mobile|energy|banking|electronics|lounge_access|cashback|device_insurance|travel_insurance|finance|other)$",
        description="Benefit category"
    )
    vendor_domain: str | None = Field(None, description="Vendor domain if mentioned (e.g., 'amazon.co.uk')")
    vendor_name: str | None = Field(None, description="Vendor/retailer name if mentioned (e.g., 'Amazon')")
    source_url: str = Field(..., description="URL where benefit was found")


class ExtractionResult(BaseModel):
    """Result of benefit extraction."""
    benefits: List[BenefitDTO]


EXTRACTION_PROMPT = """You are an expert at extracting membership benefits from web pages found via internet search. 
Your goal is to identify FACTUAL benefit items that members receive from the internet search results provided.

IMPORTANT: The text provided below comes from web pages found by searching the internet for "{membership_name} membership benefits". 
Your task is to extract concrete, specific benefits that are mentioned in these internet search results.

RULES:
1. Extract only EXPLICIT benefits mentioned in the text from internet search results
2. NO guesses or assumptions - only extract what is clearly stated in the web pages
3. Search through the provided text carefully - these are real web pages found via internet search
4. Keep titles under 80 characters
5. Keep descriptions under 220 characters
6. Be specific and factual - extract real benefits that exist on the internet
7. Include the source URL for each benefit (from the internet search results provided)
8. Use the exact category from the allowed list
9. Extract vendor_domain (e.g., "amazon.co.uk", "booking.com") if the benefit mentions a specific vendor
10. Extract vendor_name (e.g., "Amazon", "Booking.com") if mentioned - this is the human-readable vendor name
11. If vendor_domain is provided but vendor_name is not, infer vendor_name from vendor_domain
12. Look for benefits that are actually mentioned on the web pages - these are real internet sources

ALLOWED CATEGORIES:
- travel: General travel perks
- travel_insurance: Travel insurance coverage
- insurance: Other insurance types
- breakdown_cover: Vehicle breakdown assistance
- retail: Shopping discounts
- dining: Restaurant/food benefits
- mobile: Mobile phone perks
- energy: Utility discounts
- banking: Financial services
- electronics: Tech/gadget benefits
- lounge_access: Airport lounge access
- cashback: Cash back rewards
- device_insurance: Phone/device insurance
- finance: Investment/trading perks
- other: Anything else

EXAMPLES OF GOOD EXTRACTIONS:
- "Airport Lounge Access" / "Access to 1,000+ airport lounges worldwide with LoungeKey" / category: "lounge_access"
- "Travel Insurance" / "Comprehensive worldwide travel insurance for trips up to 45 days" / category: "travel_insurance"
- "Booking.com Cashback" / "5% cashback on Booking.com purchases" / category: "cashback"

DO NOT EXTRACT:
- Vague marketing promises
- Generic statements without specifics
- Terms and conditions
- Features that aren't benefits (e.g., "24/7 support")

Extract ONLY what you can verify from the provided text."""


def extract_benefits_from_pages(
    membership_name: str,
    pages: List[Dict[str, str]],
    max_retries: int = 1
) -> List[Dict[str, Any]]:
    """
    Extract benefits from web pages using GPT.
    
    Args:
        membership_name: Name of the membership
        pages: List of {"url": str, "text": str} dicts
        max_retries: Number of retries on validation failure
        
    Returns:
        List of benefit dictionaries
    """
    if not client:
        raise ValueError("OpenAI API key not configured")
    
    if not pages:
        return []
    
    # Build the input payload
    input_data = {
        "membership_name": membership_name,
        "pages": [
            {
                "url": page["url"],
                "text": page["text"][:8000]  # Limit to 8k chars per page
            }
            for page in pages[:5]  # Max 5 pages as per spec
        ]
    }
    
    # Format the prompt with membership name
    formatted_prompt = EXTRACTION_PROMPT.replace("{membership_name}", membership_name)
    
    for attempt in range(max_retries + 1):
        try:
            print(f"  📞 Calling GPT-4o-mini (attempt {attempt + 1}/{max_retries + 1}) to extract benefits from internet search results...")
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Using GPT-4o-mini to extract benefits from internet search results
                messages=[
                    {"role": "system", "content": formatted_prompt},
                    {"role": "user", "content": f"""Extract benefits from the following internet search results for "{membership_name}".

These web pages were found by searching the internet for "{membership_name} membership benefits". 
Please extract all concrete benefits mentioned in these pages:

{json.dumps(input_data, indent=2)}"""}
                ],
                temperature=0.3,  # Low temperature for factual extraction
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if not content:
                continue
            
            # Parse and validate
            raw_data = json.loads(content)
            result = ExtractionResult(**raw_data)
            
            # Convert to dicts
            return [benefit.model_dump() for benefit in result.benefits]
            
        except (json.JSONDecodeError, ValidationError) as e:
            print(f"Extraction attempt {attempt + 1} failed: {e}")
            if attempt == max_retries:
                # Return empty on final failure
                return []
            continue
        except Exception as e:
            print(f"Extraction error: {e}")
            return []
    
    return []

