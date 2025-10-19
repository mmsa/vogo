"""Analytics API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.db import get_db
from app.core.auth import get_current_user
from app.models import User, AnalyticsEvent

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class EventCreate(BaseModel):
    event_name: str  # 'login', 'affiliate_click', 'membership_added', etc.
    source: Optional[str] = None  # 'web', 'extension', 'api'
    payload: Optional[Dict[str, Any]] = None  # Additional event data


@router.post("/event")
def track_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Track an analytics event."""
    analytics_event = AnalyticsEvent(
        event_name=event.event_name,
        user_id=current_user.id,
        source=event.source or "web",
        payload=event.payload,
        created_at=datetime.utcnow(),
    )

    db.add(analytics_event)
    db.commit()

    return {"message": "Event tracked successfully", "event_name": event.event_name}
