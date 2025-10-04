from pydantic import BaseModel


class VendorCreate(BaseModel):
    name: str
    domain: str


class VendorRead(BaseModel):
    id: int
    name: str
    domain: str
    
    model_config = {"from_attributes": True}

