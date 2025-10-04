from typing import Optional
from pydantic import BaseModel


class UserMembershipCreate(BaseModel):
    user_id: int
    membership_id: int
    notes: Optional[str] = None


class UserMembershipRead(BaseModel):
    id: int
    user_id: int
    membership_id: int
    notes: Optional[str] = None
    
    model_config = {"from_attributes": True}

