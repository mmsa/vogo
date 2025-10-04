"""Embeddings service for semantic search using OpenAI."""
from typing import List
from openai import OpenAI
from app.core.config import settings


client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None


def get_embedding(text: str) -> List[float]:
    """
    Generate embedding for given text using OpenAI.
    
    Args:
        text: Text to embed
        
    Returns:
        List of floats representing the embedding vector
    """
    if not client:
        raise ValueError("OpenAI API key not configured")
    
    response = client.embeddings.create(
        input=text,
        model=settings.embed_model
    )
    return response.data[0].embedding


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts in a batch.
    
    Args:
        texts: List of texts to embed
        
    Returns:
        List of embedding vectors
    """
    if not client:
        raise ValueError("OpenAI API key not configured")
    
    response = client.embeddings.create(
        input=texts,
        model=settings.embed_model
    )
    return [item.embedding for item in response.data]

