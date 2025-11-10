from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.core.db import Base


class Membership(Base):
    __tablename__ = "memberships"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Full name: "Revolut Premium"
    provider_slug = Column(String, unique=True, index=True, nullable=False)
    provider_name = Column(String, nullable=True)  # Provider: "Revolut"
    plan_name = Column(String, nullable=True)  # Plan: "Premium"
    plan_tier = Column(Integer, nullable=True)  # Tier level: 1=lowest, higher=better (e.g., Standard=1, Premium=2, Metal=3)
    
    # Smart Add fields
    is_catalog = Column(Boolean, default=True, nullable=False)  # True = curated, False = discovered
    discovered_by_user_id = Column(Integer, nullable=True)  # User who discovered it
    status = Column(String, default="active", nullable=False)  # active, pending, rejected
    
    # Affiliate fields for monetization
    affiliate_id = Column(String, nullable=True)  # Partner's affiliate ID
    affiliate_url = Column(String, nullable=True)  # Affiliate signup/purchase URL
    commission_type = Column(String, nullable=True)  # e.g., "cpa", "revenue_share", "hybrid"
    partner_name = Column(String, nullable=True)  # Affiliate network/partner name
    commission_notes = Column(Text, nullable=True)  # Notes about commission structure
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
