from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from app.core.db import Base


class Benefit(Base):
    __tablename__ = "benefits"
    
    id = Column(Integer, primary_key=True, index=True)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    vendor_name = Column(String, nullable=True)  # Vendor/retailer name
    vendor_domain = Column(String, index=True)
    category = Column(String, index=True)
    source_url = Column(String)
    expires_at = Column(DateTime)
    
    # Smart Add validation fields
    validation_status = Column(String, default="approved", nullable=False)  # pending, approved, rejected
    source_confidence = Column(Float, nullable=True)  # 0.0-1.0 confidence from LLM
    last_checked_at = Column(DateTime, nullable=True)  # When we last verified this benefit
    
    # Affiliate fields for monetization
    affiliate_id = Column(String, nullable=True)  # Partner's affiliate ID for this benefit
    affiliate_url = Column(String, nullable=True)  # Direct affiliate link to claim benefit
    commission_type = Column(String, nullable=True)  # e.g., "cpa", "cps", "revenue_share"
    partner_name = Column(String, nullable=True)  # Affiliate network/partner name
    commission_notes = Column(Text, nullable=True)  # Commission details

