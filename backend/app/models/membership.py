from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.core.db import Base


class Membership(Base):
    __tablename__ = "memberships"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Full name: "Revolut Premium"
    provider_slug = Column(String, unique=True, index=True, nullable=False)
    provider_name = Column(String, nullable=True)  # Provider: "Revolut"
    plan_name = Column(String, nullable=True)  # Plan: "Premium"
    
    # Smart Add fields
    is_catalog = Column(Boolean, default=True, nullable=False)  # True = curated, False = discovered
    discovered_by_user_id = Column(Integer, nullable=True)  # User who discovered it
    status = Column(String, default="active", nullable=False)  # active, pending, rejected
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
