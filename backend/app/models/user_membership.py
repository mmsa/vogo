from sqlalchemy import Column, Integer, ForeignKey, Text
from app.core.db import Base


class UserMembership(Base):
    __tablename__ = "user_memberships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    notes = Column(Text)

