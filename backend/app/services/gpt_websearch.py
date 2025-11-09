"""GPT-based web search using GPT-4o-mini-search-preview with built-in web search."""

import json
from typing import List, Dict, Any, Tuple
from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError
from app.core.config import settings
from app.services.websearch import search_membership_sites

client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None


class BenefitSearchResult(BaseModel):
    """Benefit extracted from web search."""

    title: str = Field(..., max_length=80, description="Short benefit title")
    description: str = Field(..., max_length=220, description="Factual description")
    category: str = Field(
        ...,
        pattern="^(travel|insurance|breakdown_cover|retail|dining|mobile|energy|banking|electronics|lounge_access|cashback|device_insurance|travel_insurance|finance|other)$",
        description="Benefit category",
    )
    vendor_domain: str | None = Field(
        None, description="Vendor domain if mentioned (e.g., 'amazon.co.uk')"
    )
    vendor_name: str | None = Field(
        None, description="Vendor/retailer name if mentioned (e.g., 'Amazon')"
    )
    source_url: str = Field(..., description="URL where benefit was found")


class SearchResponse(BaseModel):
    """Response from GPT web search."""

    benefits: List[BenefitSearchResult]
    search_urls: List[str] = Field(
        default_factory=list, description="URLs that were searched"
    )


def search_and_extract_benefits_with_gpt(
    membership_name: str,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
    """
    Use GPT-4o-mini-search-preview to search the web and extract benefits directly.

    This model has built-in web search capabilities, so it can search the internet
    and return structured JSON with benefits - no need for separate search/fetch steps!

    Args:
        membership_name: Name of the membership to search for

    Returns:
        Tuple of:
        - List of benefit dicts (ready to save to DB) if GPT found benefits directly
        - List of search result dicts (with 'url', 'title', 'snippet') for fallback page fetching
    """
    if not client:
        print("  ⚠️ OpenAI API key not configured, falling back to DuckDuckGo")
        fallback_results = search_membership_sites(
            f"{membership_name} benefits", limit=5
        )
        return [], fallback_results

    try:
        print(
            f"  🌐 Using GPT-4o-mini-search-preview to search the web for '{membership_name} benefits'..."
        )
        print(
            f"  📝 This model has built-in web search - it will search the internet and return benefits directly!"
        )

        # Use GPT-4o-mini-search-preview which has built-in web search
        response = client.chat.completions.create(
            model="gpt-4o-mini-search-preview",  # Model with built-in web search!
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert at finding membership benefits by searching the web.

Your task:
1. Search the internet for the membership's official pages, benefit lists, and comparison sites
2. Extract concrete, specific benefits that members receive
3. Return structured JSON with all benefits found

IMPORTANT: Use your built-in web search capability to find real, current information from the internet.
Search multiple sources to get comprehensive benefit information.

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

Return ONLY factual benefits that are clearly stated on official pages or reputable sources.""",
                },
                {
                    "role": "user",
                    "content": f"""Search the internet for "{membership_name}" membership benefits and perks.

Find:
- Official membership pages
- Benefit lists
- Comparison sites
- Review sites with benefit information

Extract all concrete benefits that members receive. For each benefit, include:
- Title (short, MUST be under 80 characters - truncate if needed)
- Description (factual, MUST be under 220 characters - truncate if needed)
- Category (from allowed list)
- Vendor domain/name if mentioned
- Source URL where you found it

CRITICAL: Descriptions MUST be 220 characters or less. If a description is longer, truncate it to fit.

CRITICAL: You MUST return ONLY valid JSON, no other text. Return as JSON with this exact structure:
{{
  "benefits": [
    {{
      "title": "Benefit name",
      "description": "What the benefit provides",
      "category": "category_name",
      "vendor_domain": "example.com",
      "vendor_name": "Example",
      "source_url": "https://..."
    }}
  ],
  "search_urls": ["url1", "url2", ...]
}}

Return ONLY the JSON object, no markdown, no explanations, just pure JSON.""",
                },
            ],
            # Note: gpt-4o-mini-search-preview doesn't support:
            # - temperature parameter
            # - response_format with web_search
            # So we'll parse JSON manually from the response
        )

        content = response.choices[0].message.content
        if not content:
            print("  ⚠️ GPT returned empty response, falling back to DuckDuckGo")
            fallback_results = search_membership_sites(
                f"{membership_name} benefits", limit=5
            )
            return [], fallback_results

        # Extract JSON from response (GPT might wrap it in markdown or add text)
        # Try to find JSON object in the response
        json_content = content.strip()

        # Remove markdown code blocks if present
        if json_content.startswith("```json"):
            json_content = json_content[7:]  # Remove ```json
        elif json_content.startswith("```"):
            json_content = json_content[3:]  # Remove ```

        if json_content.endswith("```"):
            json_content = json_content[:-3]  # Remove closing ```

        json_content = json_content.strip()

        # Try to extract JSON object if there's extra text
        import re

        json_match = re.search(r"\{[\s\S]*\}", json_content)
        if json_match:
            json_content = json_match.group(0)

        # Parse and validate the JSON response
        try:
            raw_data = json.loads(json_content)

            # Fix any descriptions that are too long before validation
            if "benefits" in raw_data:
                for benefit in raw_data["benefits"]:
                    # Truncate description if it exceeds 220 characters
                    if "description" in benefit and len(benefit["description"]) > 220:
                        benefit["description"] = benefit["description"][:217] + "..."
                    # Truncate title if it exceeds 80 characters
                    if "title" in benefit and len(benefit["title"]) > 80:
                        benefit["title"] = benefit["title"][:77] + "..."

            result = SearchResponse(**raw_data)

            print(
                f"  ✅ GPT web search found {len(result.benefits)} benefits from {len(result.search_urls)} sources"
            )

            # Convert benefits to dict format ready for database
            extracted_benefits = []
            for benefit in result.benefits:
                extracted_benefits.append(
                    {
                        "title": benefit.title,
                        "description": benefit.description,
                        "category": benefit.category,
                        "vendor_domain": benefit.vendor_domain,
                        "vendor_name": benefit.vendor_name,
                        "source_url": benefit.source_url,
                    }
                )

            # Also return search results for fallback (in case we need to fetch pages)
            search_results = []
            for url in result.search_urls[:5]:  # Limit to 5 URLs
                search_results.append(
                    {
                        "url": url,
                        "title": f"Source: {url}",
                        "snippet": "",
                    }
                )

            return extracted_benefits, search_results

        except (json.JSONDecodeError, ValidationError) as e:
            print(f"  ⚠️ Failed to parse GPT response: {e}")
            print(f"  📄 Raw response: {content[:500]}")
            print(f"  🔄 Falling back to DuckDuckGo search...")
            fallback_results = search_membership_sites(
                f"{membership_name} benefits", limit=5
            )
            return (
                [],
                fallback_results,
            )  # No benefits extracted, but have URLs for fallback

    except Exception as e:
        print(f"  ❌ GPT web search failed: {e}")
        import traceback

        traceback.print_exc()
        # Fallback to direct search
        print(f"  🔄 Falling back to DuckDuckGo search...")
        fallback_results = search_membership_sites(
            f"{membership_name} benefits", limit=5
        )
        return [], fallback_results  # No benefits extracted, but have URLs for fallback


# Backward compatibility function
def search_with_gpt(membership_name: str, limit: int = 5) -> List[Dict[str, str]]:
    """
    Backward compatibility wrapper - returns search results for page fetching.

    Use search_and_extract_benefits_with_gpt() for direct benefit extraction.
    """
    _, search_results = search_and_extract_benefits_with_gpt(membership_name)
    return search_results[:limit]
