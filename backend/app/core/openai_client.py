"""Centralized OpenAI client for the application."""

from openai import OpenAI
from app.core.config import settings

# Single OpenAI client instance for the entire application
openai_client = (
    OpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_timeout_s,
        max_retries=settings.openai_max_retries,
    )
    if settings.openai_api_key
    else None
)

def get_openai_client() -> OpenAI:
    """
    Get the shared OpenAI client instance.
    
    Returns:
        OpenAI client instance or None if API key is not configured
    """
    return openai_client
