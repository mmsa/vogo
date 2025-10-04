from typing import Optional
from pydantic import BaseModel


class Recommendation(BaseModel):
    title: str
    rationale: str
    estimated_saving: Optional[str] = None
    action_url: Optional[str] = None
    membership: Optional[str] = None
    benefit_id: Optional[int] = None

