"""Semantic matching service using embeddings and LLM."""

import numpy as np
from typing import List, Dict, Any, Tuple
from openai import OpenAI
from cachetools import TTLCache
import hashlib
import json

from app.core.config import settings
from app.models import Benefit, Membership
from app.services.page_scraper import metadata_to_text


# Initialize OpenAI client with API key from settings
client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

# Cache for embeddings (1 hour TTL, max 1000 entries)
embedding_cache = TTLCache(maxsize=1000, ttl=3600)

# Cache for semantic match results (10 min TTL, max 500 entries)
match_cache = TTLCache(maxsize=500, ttl=600)


def get_embedding(text: str, model: str = "text-embedding-3-small") -> List[float]:
    """
    Get embedding for text with caching.

    Args:
        text: Text to embed
        model: OpenAI embedding model

    Returns:
        Embedding vector
    """
    if not client:
        raise RuntimeError("OpenAI client not initialized. Check OPENAI_API_KEY.")
    
    # Create cache key
    cache_key = hashlib.md5(f"{model}:{text}".encode()).hexdigest()

    if cache_key in embedding_cache:
        return embedding_cache[cache_key]

    # Get embedding from OpenAI
    response = client.embeddings.create(input=text, model=model)

    embedding = response.data[0].embedding
    embedding_cache[cache_key] = embedding

    return embedding


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a_np = np.array(a)
    b_np = np.array(b)

    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))


def create_benefit_text(benefit: Benefit, membership: Membership) -> str:
    """Create searchable text for a benefit."""
    parts = []

    # Membership info
    parts.append(f"Membership: {membership.name}")
    if membership.provider_name:
        parts.append(f"Provider: {membership.provider_name}")

    # Benefit info
    parts.append(f"Benefit: {benefit.title}")
    if benefit.description:
        parts.append(f"Description: {benefit.description}")
    if benefit.category:
        parts.append(f"Category: {benefit.category.replace('_', ' ')}")
    if benefit.vendor_domain:
        parts.append(f"Domain: {benefit.vendor_domain}")

    return " | ".join(parts)


async def find_semantic_matches(
    page_metadata: Dict[str, str],
    user_benefits: List[Tuple[Benefit, Membership]],
    top_k: int = 5,
    threshold: float = 0.6,
) -> List[Dict[str, Any]]:
    """
    Find benefits that semantically match the current page.

    Args:
        page_metadata: Scraped page metadata
        user_benefits: List of (Benefit, Membership) tuples
        top_k: Number of top matches to return
        threshold: Minimum similarity score (0-1)

    Returns:
        List of matched benefits with scores
    """
    # Create cache key
    cache_key = hashlib.md5(
        json.dumps(
            {
                "url": page_metadata.get("url"),
                "benefit_ids": [b[0].id for b in user_benefits],
            },
            sort_keys=True,
        ).encode()
    ).hexdigest()

    if cache_key in match_cache:
        return match_cache[cache_key]

    # Get page embedding
    page_text = metadata_to_text(page_metadata)
    page_embedding = get_embedding(page_text)

    # Calculate similarities
    matches = []
    for benefit, membership in user_benefits:
        benefit_text = create_benefit_text(benefit, membership)
        benefit_embedding = get_embedding(benefit_text)

        similarity = cosine_similarity(page_embedding, benefit_embedding)

        if similarity >= threshold:
            matches.append(
                {
                    "benefit_id": benefit.id,
                    "benefit": benefit,
                    "membership": membership,
                    "similarity_score": round(similarity, 3),
                    "benefit_text": benefit_text,
                }
            )

    # Sort by similarity and take top K
    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    result = matches[:top_k]

    # Cache result
    match_cache[cache_key] = result

    return result


async def generate_user_message(
    page_metadata: Dict[str, str],
    semantic_matches: List[Dict[str, Any]],
    model: str = "gpt-4o-mini",
) -> Dict[str, Any]:
    """
    Use mini LLM to generate user-friendly message about matched benefits.

    Args:
        page_metadata: Page metadata
        semantic_matches: Semantic match results
        model: OpenAI model to use

    Returns:
        Dictionary with message and recommendations
    """
    if not semantic_matches:
        return {
            "has_matches": False,
            "message": f"No benefits found for {page_metadata.get('domain', 'this site')}",
            "matches": [],
        }

    # Prepare context for LLM
    context = {
        "page": {
            "domain": page_metadata.get("domain"),
            "title": page_metadata.get("title"),
            "description": page_metadata.get("description", "")[:200],
        },
        "matches": [
            {
                "membership": m["membership"].name,
                "benefit": m["benefit"].title,
                "description": m["benefit"].description or "",
                "score": m["similarity_score"],
            }
            for m in semantic_matches
        ],
    }

    # Create prompt for mini LLM
    prompt = f"""You're VogPlus assistant. User is browsing a website and you found relevant benefits.

Current page: {context['page']['domain']}
Page title: {context['page']['title']}

Matched benefits:
{json.dumps(context['matches'], indent=2)}

Generate a friendly, concise message (1-2 sentences) telling the user:
1. What benefits they have that are relevant to THIS website
2. How they can use them right now

Return ONLY JSON:
{{
  "message": "Your 1-2 sentence message here",
  "action": "View Benefits" or "Learn More" or "Use Now",
  "highlight_benefit_ids": [list of most relevant benefit IDs]
}}

Be specific and actionable. Focus on the TOP matching benefit.
"""

    if not client:
        # Fallback when no OpenAI key
        top_match = semantic_matches[0]
        return {
            "has_matches": True,
            "message": f"You have {top_match['benefit'].title} from your {top_match['membership'].name} that works on this site!",
            "action": "View Benefits",
            "highlight_benefit_ids": [top_match["benefit_id"]],
            "matches": semantic_matches,
            "match_count": len(semantic_matches),
        }

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are VogPlus benefits assistant. Be concise and helpful.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=150,
            response_format={"type": "json_object"},
        )

        llm_response = json.loads(response.choices[0].message.content)

        return {
            "has_matches": True,
            "message": llm_response.get("message", ""),
            "action": llm_response.get("action", "View Benefits"),
            "highlight_benefit_ids": llm_response.get("highlight_benefit_ids", []),
            "matches": semantic_matches,
            "match_count": len(semantic_matches),
        }

    except Exception as e:
        # Fallback message
        top_match = semantic_matches[0]
        return {
            "has_matches": True,
            "message": f"You have {top_match['benefit'].title} from your {top_match['membership'].name} that works on this site!",
            "action": "View Benefits",
            "highlight_benefit_ids": [top_match["benefit_id"]],
            "matches": semantic_matches,
            "match_count": len(semantic_matches),
            "error": str(e),
        }
