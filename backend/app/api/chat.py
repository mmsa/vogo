"""Chat API endpoints for conversational benefits assistant."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.db import get_db
from app.schemas.chat import ChatRequest, ChatResponse, BenefitReference
from app.services.chat_service import generate_chat_response
from app.models.user import User
from app.models.membership import Membership
from app.models.benefit import Benefit
from app.models.user_membership import UserMembership


router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Conversational chat endpoint for benefits questions.
    
    Accepts:
    - message: User's question
    - conversation_history: Previous messages for context
    
    Returns:
    - message: AI assistant's response
    - related_benefits: Benefits referenced in the response
    """
    
    # Get user's memberships and benefits
    user_memberships = db.query(UserMembership).filter(
        UserMembership.user_id == current_user.id
    ).all()
    
    if not user_memberships:
        return ChatResponse(
            message="You don't have any memberships yet! Add your memberships to discover benefits and I'll help you make the most of them. 💎",
            related_benefits=[]
        )
    
    membership_ids = [um.membership_id for um in user_memberships]
    
    # Get all approved benefits for user's memberships
    benefits_query = db.query(Benefit, Membership).join(
        Membership, Benefit.membership_id == Membership.id
    ).filter(
        Benefit.membership_id.in_(membership_ids),
        Benefit.validation_status == "approved"
    ).all()
    
    if not benefits_query:
        return ChatResponse(
            message="Your memberships are set up, but we're still discovering benefits for them. Check back soon! 🔍",
            related_benefits=[]
        )
    
    # Generate response (now with intelligent upgrade detection)
    response_data = generate_chat_response(
        user_message=request.message,
        conversation_history=[msg.dict() for msg in request.conversation_history],
        user_benefits=benefits_query,
        user_id=current_user.id,  # Pass user_id directly for upgrade searches
        db=db
    )
    
    return ChatResponse(
        message=response_data["message"],
        related_benefits=[
            BenefitReference(**b) for b in response_data["related_benefits"]
        ]
    )


@router.get("/hello")
async def hello(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a personalized greeting message for the chat.
    Returns a context-aware introduction based on user's memberships.
    """
    user_memberships = db.query(UserMembership).filter(
        UserMembership.user_id == current_user.id
    ).count()
    
    benefits_count = db.query(Benefit).join(
        UserMembership, Benefit.membership_id == UserMembership.membership_id
    ).filter(
        UserMembership.user_id == current_user.id,
        Benefit.validation_status == "approved"
    ).count()
    
    if user_memberships == 0:
        message = "👋 Hi! I'm your VogPlus.ai assistant. Add your memberships and I'll help you discover and use all your benefits!"
    elif benefits_count == 0:
        message = f"👋 Hi! I see you have {user_memberships} membership{'s' if user_memberships > 1 else ''}. We're discovering benefits for you now. Ask me anything!"
    else:
        message = f"👋 Hi! You have {benefits_count} benefit{'s' if benefits_count > 1 else ''} across {user_memberships} membership{'s' if user_memberships > 1 else ''}. What would you like to know?"
    
    return {"message": message}

