"""Conversational AI service for benefits chat."""

import json
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from openai import OpenAI

from app.core.config import settings
from app.services.semantic_matcher import get_embedding, cosine_similarity, create_benefit_text
from app.models.membership import Membership
from app.models.benefit import Benefit
from app.models.user_membership import UserMembership


# Initialize OpenAI client
client = None
if settings.openai_api_key:
    client = OpenAI(api_key=settings.openai_api_key)


# Keywords indicating user intent to purchase/subscribe
BUYING_INTENT_KEYWORDS = [
    "buy", "purchase", "get", "need", "want", "looking for",
    "subscribe", "subscription", "sign up", "join", "upgrade",
    "switch to", "considering", "thinking about", "interested in",
    "shopping for", "looking to get", "planning to buy"
]


def detect_buying_intent(query: str) -> bool:
    """
    Detect if user is asking about buying, subscribing, or getting something.
    
    Args:
        query: User's message
        
    Returns:
        True if buying intent detected
    """
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in BUYING_INTENT_KEYWORDS)


def find_membership_upgrades(user_id: int, query: str, db: Session) -> List[Dict]:
    """
    Find membership upgrades that could provide better benefits for the query.
    
    Args:
        user_id: User's ID
        query: User's question/intent
        db: Database session
        
    Returns:
        List of potential upgrades with benefits
    """
    if not client:
        return []
    
    # Get user's current memberships
    user_membership_ids = [
        um.membership_id 
        for um in db.query(UserMembership).filter(UserMembership.user_id == user_id).all()
    ]
    
    # Get ALL memberships with their approved benefits
    all_memberships = db.query(Membership).filter(
        Membership.status == "active"
    ).all()
    
    upgrades = []
    query_embedding = get_embedding(query)
    
    if not query_embedding:
        return []
    
    for membership in all_memberships:
        # Skip if user already has this membership
        if membership.id in user_membership_ids:
            continue
        
        # Get benefits for this membership
        benefits = db.query(Benefit).filter(
            Benefit.membership_id == membership.id,
            Benefit.validation_status == "approved"
        ).all()
        
        if not benefits:
            continue
        
        # Check if any benefits match the query
        relevant_benefits = []
        for benefit in benefits:
            benefit_text = create_benefit_text(benefit, membership)
            benefit_embedding = get_embedding(benefit_text)
            
            if benefit_embedding:
                similarity = cosine_similarity(query_embedding, benefit_embedding)
                if similarity >= 0.55:  # Slightly lower threshold for suggestions
                    relevant_benefits.append({
                        "benefit_id": benefit.id,
                        "benefit_title": benefit.title,
                        "benefit_description": benefit.description,
                        "similarity_score": round(similarity, 3),
                        "category": benefit.category,
                        "vendor_domain": benefit.vendor_domain
                    })
        
        if relevant_benefits:
            # Sort by similarity
            relevant_benefits.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            upgrades.append({
                "membership_id": membership.id,
                "membership_name": membership.name,
                "provider": membership.provider_name,
                "plan": membership.plan_name,
                "matching_benefits": relevant_benefits[:3],  # Top 3 benefits
                "total_matching": len(relevant_benefits),
                "best_match_score": relevant_benefits[0]["similarity_score"]
            })
    
    # Sort upgrades by best match score
    upgrades.sort(key=lambda x: x["best_match_score"], reverse=True)
    return upgrades[:3]  # Top 3 upgrade suggestions


def search_benefits_by_query(query: str, user_benefits: List[Any], threshold: float = 0.6, top_k: int = 5) -> List[Dict]:
    """
    Search user's benefits using semantic similarity on natural language query.
    
    Args:
        query: User's natural language question
        user_benefits: List of (Benefit, Membership) tuples
        threshold: Minimum similarity score
        top_k: Maximum number of results
        
    Returns:
        List of matching benefits with similarity scores
    """
    if not client:
        return []
    
    # Get query embedding
    query_embedding = get_embedding(query)
    if not query_embedding:
        return []
    
    # Calculate similarities
    matches = []
    for benefit, membership in user_benefits:
        benefit_text = create_benefit_text(benefit, membership)
        benefit_embedding = get_embedding(benefit_text)
        
        if benefit_embedding:
            similarity = cosine_similarity(query_embedding, benefit_embedding)
            
            if similarity >= threshold:
                matches.append({
                    "benefit_id": benefit.id,
                    "benefit_title": benefit.title,
                    "benefit_description": benefit.description,
                    "membership_name": membership.name,
                    "category": benefit.category,
                    "vendor_domain": benefit.vendor_domain,
                    "similarity_score": round(similarity, 3),
                })
    
    # Sort by similarity and return top_k
    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    return matches[:top_k]


def generate_chat_response(
    user_message: str, 
    conversation_history: List[Dict[str, str]], 
    user_benefits: List[Any],
    user_id: int,
    db: Session
) -> Dict[str, Any]:
    """
    Generate an intelligent response about benefits, discounts, and upgrade opportunities.
    
    Args:
        user_message: User's message
        conversation_history: Previous messages
        user_benefits: List of (Benefit, Membership) tuples
        user_id: Current user's ID
        db: Database session
        
    Returns:
        Dict with 'message', 'related_benefits', and optional 'suggested_upgrades'
    """
    if not client:
        return {
            "message": "Chat service is not available. Please check OpenAI API configuration.",
            "related_benefits": []
        }
    
    # Detect if user is asking about buying/subscribing
    has_buying_intent = detect_buying_intent(user_message)
    
    # Search for relevant benefits they already have
    relevant_benefits = search_benefits_by_query(user_message, user_benefits, threshold=0.5, top_k=5)
    
    # If buying intent detected, also search for upgrade opportunities
    upgrade_suggestions = []
    if has_buying_intent and user_id:
        upgrade_suggestions = find_membership_upgrades(user_id, user_message, db)
    
    # Build context for LLM
    benefits_context = ""
    if relevant_benefits:
        benefits_context = "\n\n✅ EXISTING BENEFITS (User already has these):\n"
        for b in relevant_benefits:
            benefits_context += f"- {b['benefit_title']} ({b['membership_name']})"
            if b.get('benefit_description'):
                benefits_context += f": {b['benefit_description']}"
            benefits_context += f" [Relevance: {int(b['similarity_score']*100)}%]\n"
            if b.get('vendor_domain'):
                benefits_context += f"  🌐 Available at: {b['vendor_domain']}\n"
    
    upgrade_context = ""
    if upgrade_suggestions:
        upgrade_context = "\n\n💎 SUGGESTED MEMBERSHIP UPGRADES:\n"
        for upgrade in upgrade_suggestions:
            upgrade_context += f"\n📦 {upgrade['membership_name']}"
            if upgrade.get('provider'):
                upgrade_context += f" by {upgrade['provider']}"
            if upgrade.get('plan'):
                upgrade_context += f" ({upgrade['plan']})"
            upgrade_context += f"\n  Would give you {upgrade['total_matching']} relevant benefit(s):\n"
            
            for benefit in upgrade['matching_benefits']:
                upgrade_context += f"  • {benefit['benefit_title']}"
                if benefit.get('benefit_description'):
                    upgrade_context += f": {benefit['benefit_description']}"
                upgrade_context += f" [Match: {int(benefit['similarity_score']*100)}%]\n"
    
    # Build intelligent system prompt
    system_prompt = f"""You are VogPlus.app's intelligent benefits assistant. Your goal is to help users save money and maximize their membership benefits.

CRITICAL RULES:
1. **If user already has relevant benefits**: Tell them they can use their existing benefit! Be specific and encouraging.
2. **If buying intent detected AND upgrades available**: Suggest the upgrade could save them money. Mention the specific benefit.
3. **If buying intent BUT already covered**: Emphasize they don't need to buy anything - they already have it!
4. **Always be conversational and concise** (2-3 sentences max)
5. **Use emojis sparingly** (1-2 max)
6. **Focus on SAVING MONEY** - that's why they're talking to you

User's Question Intent: {"🛒 BUYING/SUBSCRIBING" if has_buying_intent else "ℹ️ General inquiry"}

{benefits_context if benefits_context else "❌ No existing benefits match this query"}
{upgrade_context if upgrade_context else ""}

Your Response Strategy:
- If they have matching benefits: Highlight them immediately and say "You already have this!"
- If upgrade would help: Say "Consider upgrading to [membership] for [specific benefit]"
- If neither: Provide general helpful advice"""
    
    context_messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]
    
    # Add conversation history (last 6 messages)
    for msg in conversation_history[-6:]:
        context_messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    # Add current message
    context_messages.append({
        "role": "user",
        "content": user_message
    })
    
    # Call OpenAI
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=context_messages,
            temperature=0.7,
            max_tokens=250,  # Increased for more detailed responses
        )
        
        assistant_message = response.choices[0].message.content
        
        # Build response with benefits and upgrades
        response_data = {
            "message": assistant_message,
            "related_benefits": [
                {
                    "id": b["benefit_id"],
                    "title": b["benefit_title"],
                    "membership_name": b["membership_name"]
                }
                for b in relevant_benefits[:3]  # Top 3 only
            ]
        }
        
        # Add upgrade suggestions if available
        if upgrade_suggestions:
            response_data["suggested_upgrades"] = [
                {
                    "membership_name": u["membership_name"],
                    "provider": u.get("provider"),
                    "plan": u.get("plan"),
                    "relevant_benefits_count": u["total_matching"],
                    "top_benefit": u["matching_benefits"][0]["benefit_title"] if u["matching_benefits"] else None
                }
                for u in upgrade_suggestions[:2]  # Top 2 upgrades
            ]
        
        return response_data
    
    except Exception as e:
        print(f"Error generating chat response: {e}")
        return {
            "message": "Sorry, I'm having trouble processing that right now. Please try again.",
            "related_benefits": []
        }

