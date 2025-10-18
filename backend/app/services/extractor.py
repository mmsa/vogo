"""Benefit extraction service using AI."""

import json
from typing import List, Dict
from app.services.ai_client import _call, parse_json_response
from app.services.ai_prompts import EXTRACT_PROMPT


def extract_benefits(
    membership_name: str, pages: List[Dict[str, str]], model: str
) -> List[Dict]:
    """
    Extract benefits from web pages using AI.

    Args:
        membership_name: Name of the membership
        pages: List of page dicts with url, title, and text
        model: OpenAI model to use

    Returns:
        List of benefit dictionaries
    """
    # Prepare payload for AI
    payload = {
        "membership_name": membership_name,
        "pages": [
            {
                "url": page["url"],
                "title": page.get("title", ""),
                "text": page["text"][:6000],  # Limit text per page
            }
            for page in pages
        ],
    }

    # Create messages
    messages = [
        {"role": "system", "content": EXTRACT_PROMPT},
        {"role": "user", "content": json.dumps(payload)},
    ]

    try:
        # Call AI
        raw_response = _call(model, messages, max_tokens=1500)

        # Parse response
        data = parse_json_response(raw_response)

        # Extract and validate benefits
        benefits = data.get("benefits", [])

        # Ensure each benefit has required fields
        valid_benefits = []
        for benefit in benefits[:12]:  # Limit to 12
            if all(key in benefit for key in ["title", "description", "category"]):
                valid_benefits.append(benefit)

        return valid_benefits

    except Exception as e:
        print(f"Benefit extraction failed: {e}")
        return []
