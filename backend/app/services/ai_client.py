"""OpenAI client wrapper with caching."""

import json
import orjson
from cachetools import TTLCache
from app.core.openai_client import get_openai_client

# Get shared OpenAI client
client = get_openai_client()

# Cache responses for 15 minutes
cache = TTLCache(maxsize=512, ttl=900)


def _call(
    model: str, messages: list, max_tokens: int = 800, temperature: float = 0
) -> str:
    """
    Call OpenAI API with caching.

    Args:
        model: Model name (e.g., "gpt-4o-mini")
        messages: List of message dicts with role and content
        max_tokens: Maximum tokens in response
        temperature: Sampling temperature

    Returns:
        JSON string response from the model

    Raises:
        ValueError: If OpenAI client is not configured
    """
    if not client:
        raise ValueError("OpenAI API key not configured")

    # Create cache key
    key = (model, orjson.dumps(messages).decode(), max_tokens, temperature)

    # Check cache
    if key in cache:
        return cache[key]

    # Call API
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"},
            max_tokens=max_tokens,
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")

        # Cache and return
        cache[key] = content
        return content

    except Exception as e:
        print(f"OpenAI API call failed: {e}")
        raise


def parse_json_response(response: str, retry: bool = True) -> dict:
    """
    Parse JSON response with optional retry on failure.

    Args:
        response: JSON string from model
        retry: Whether to return empty dict on parse failure

    Returns:
        Parsed dictionary

    Raises:
        json.JSONDecodeError: If retry=False and parsing fails
    """
    try:
        return json.loads(response)
    except json.JSONDecodeError as e:
        if retry:
            print(f"JSON parse error: {e}. Returning empty dict.")
            return {}
        raise
