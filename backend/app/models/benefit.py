from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from app.core.db import Base


class Benefit(Base):
    __tablename__ = "benefits"
    
    id = Column(Integer, primary_key=True, index=True)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    vendor_domain = Column(String, index=True)
    category = Column(String, index=True)
    source_url = Column(String)
    expires_at = Column(DateTime)
    
    # Smart Add validation fields
    validation_status = Column(String, default="approved", nullable=False)  # pending, approved, rejected
    source_confidence = Column(Float, nullable=True)  # 0.0-1.0 confidence from LLM
    last_checked_at = Column(DateTime, nullable=True)  # When we last verified this benefit

