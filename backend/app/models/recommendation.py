from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum
import enum
from app.core.db import Base


class RecommendationKind(str, enum.Enum):
    overlap = "overlap"
    unused = "unused"
    switch = "switch"
    bundle = "bundle"
    tip = "tip"
    add_membership = "add_membership"
    upgrade = "upgrade"


class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    rationale = Column(Text, nullable=False)
    estimated_saving_min = Column(Integer)  # in pence/cents
    estimated_saving_max = Column(Integer)  # in pence/cents
    action_url = Column(String)
    membership_id = Column(Integer, ForeignKey("memberships.id"))
    benefit_id = Column(Integer, ForeignKey("benefits.id"))
    kind = Column(SQLEnum(RecommendationKind), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

