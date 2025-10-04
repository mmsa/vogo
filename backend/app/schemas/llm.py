"""Schemas for LLM-powered endpoints."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.schemas.benefit import BenefitRead
from app.models.recommendation import RecommendationKind


class LLMContextInput(BaseModel):
    domain: Optional[str] = None
    category: Optional[str] = None
    candidate_membership_slug: Optional[str] = None


class LLMRecommendationIn(BaseModel):
    user_id: int
    context: Optional[LLMContextInput] = None


class RecommendationDTO(BaseModel):
    id: Optional[int] = None
    title: str
    rationale: str
    estimated_saving_min: Optional[int] = None
    estimated_saving_max: Optional[int] = None
    action_url: Optional[str] = None
    membership_slug: Optional[str] = None
    benefit_match_ids: List[int] = []
    kind: RecommendationKind
    
    model_config = {"from_attributes": True}


class LLMRecommendationOut(BaseModel):
    recommendations: List[RecommendationDTO]
    relevant_benefits: List[BenefitRead]


class SmartAddAlternative(BaseModel):
    membership_slug: str
    reason: str


class SmartAddIn(BaseModel):
    user_id: int
    candidate_membership_slug: str


class SmartAddOut(BaseModel):
    status: str = "ok"
    decision: str  # "add" | "already_covered" | "better_alternative"
    explanation: str
    alternatives: List[SmartAddAlternative] = []
    impacted_benefits: List[BenefitRead] = []

