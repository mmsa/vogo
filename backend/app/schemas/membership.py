from datetime import datetime
from pydantic import BaseModel


class MembershipCreate(BaseModel):
    name: str
    provider_slug: str
    provider_name: str | None = None
    plan_name: str | None = None


class MembershipRead(BaseModel):
    id: int
    name: str
    provider_slug: str
    provider_name: str | None = None
    plan_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
