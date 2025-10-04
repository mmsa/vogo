from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BenefitCreate(BaseModel):
    membership_id: int
    title: str
    description: Optional[str] = None
    vendor_domain: Optional[str] = None
    category: Optional[str] = None
    source_url: Optional[str] = None
    expires_at: Optional[datetime] = None


class BenefitRead(BaseModel):
    id: int
    membership_id: int
    title: str
    description: Optional[str] = None
    vendor_domain: Optional[str] = None
    category: Optional[str] = None
    source_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

