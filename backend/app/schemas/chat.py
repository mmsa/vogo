"""Pydantic schemas for chat API."""

from pydantic import BaseModel, Field
from typing import List, Optional


class ChatMessage(BaseModel):
    """A single message in a chat conversation."""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    """Request for chat endpoint."""
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_history: List[ChatMessage] = Field(default_factory=list, max_length=20)


class BenefitReference(BaseModel):
    """A benefit referenced in the response."""
    id: int
    title: str
    membership_name: str


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    message: str
    related_benefits: List[BenefitReference] = Field(default_factory=list)
    conversation_id: Optional[str] = None

