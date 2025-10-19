from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from app.core.db import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    event_name = Column(
        String, nullable=False, index=True
    )  # 'login', 'affiliate_click', etc.
    user_id = Column(Integer, nullable=True, index=True)
    source = Column(String, nullable=True)  # 'web', 'extension', 'api'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    payload = Column(JSONB, nullable=True)  # Additional event data

    __table_args__ = (
        Index("idx_events_name_date", "event_name", "created_at"),
        Index("idx_events_user_date", "user_id", "created_at"),
    )
