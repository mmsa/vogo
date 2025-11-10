"""Embeddings service for semantic search using OpenAI."""
from typing import List
from app.core.config import settings
from app.core.openai_client import get_openai_client


client = get_openai_client()


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

