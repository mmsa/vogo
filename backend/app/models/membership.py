from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.core.db import Base


class Membership(Base):
    __tablename__ = "memberships"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    provider_slug = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

