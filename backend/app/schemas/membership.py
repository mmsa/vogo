from datetime import datetime
from pydantic import BaseModel


class MembershipCreate(BaseModel):
    name: str
    provider_slug: str


class MembershipRead(BaseModel):
    id: int
    name: str
    provider_slug: str
    created_at: datetime
    
    model_config = {"from_attributes": True}

