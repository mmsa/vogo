"""AI service schemas."""

from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Literal


class AIContext(BaseModel):
    """Context for AI operations."""

    domain: Optional[str] = None
    category: Optional[str] = None
    question: Optional[str] = None
    candidate_membership_name: Optional[str] = None


class BenefitOut(BaseModel):
    """Benefit output schema for AI responses."""

    id: Optional[int] = None
    membership_slug: Optional[str] = None
    title: str
    description: str
    category: str
    vendor_domain: Optional[str] = None
    source_url: Optional[str] = None
    validation_status: Optional[Literal["pending", "approved", "rejected"]] = None


class RecommendationOut(BaseModel):
    """Recommendation output from AI."""

    title: str
    rationale: str
    kind: Literal["overlap", "unused", "switch", "bundle", "tip"]
    estimated_saving_min: Optional[float] = None
    estimated_saving_max: Optional[float] = None
    action_url: Optional[str] = None
    membership_slug: Optional[str] = None
    benefit_match_ids: List[int] = Field(default_factory=list)


class AIRecsResponse(BaseModel):
    """Response for AI recommendations endpoint."""

    recommendations: List[RecommendationOut]
    relevant_benefits: List[int]


class DiscoverResponse(BaseModel):
    """Response for membership discovery endpoint."""

    membership_name: str
    benefits: List[BenefitOut]


class QAResponse(BaseModel):
    """Response for Q&A endpoint."""

    answer: str
