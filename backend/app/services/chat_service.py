"""Conversational AI service for benefits chat."""

import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from openai import OpenAI

from app.core.config import settings
from app.services.semantic_matcher import get_embedding, cosine_similarity, create_benefit_text


# Initialize OpenAI client
client = None
if settings.openai_api_key:
    client = OpenAI(api_key=settings.openai_api_key)


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
    db: Session
) -> Dict[str, Any]:
    """
    Generate a conversational response to user's question about their benefits.
    
    Args:
        user_message: User's message
        conversation_history: Previous messages
        user_benefits: List of (Benefit, Membership) tuples
        db: Database session
        
    Returns:
        Dict with 'message', 'related_benefits', and optional 'action'
    """
    if not client:
        return {
            "message": "Chat service is not available. Please check OpenAI API configuration.",
            "related_benefits": []
        }
    
    # Search for relevant benefits
    relevant_benefits = search_benefits_by_query(user_message, user_benefits, threshold=0.5, top_k=5)
    
    # Build context for LLM
    benefits_context = ""
    if relevant_benefits:
        benefits_context = "\n\nRelevant benefits you have:\n"
        for b in relevant_benefits:
            benefits_context += f"- {b['benefit_title']} ({b['membership_name']}): {b['benefit_description']}\n"
            if b.get('vendor_domain'):
                benefits_context += f"  Available at: {b['vendor_domain']}\n"
    
    # Build conversation context
    context_messages = [
        {
            "role": "system",
            "content": f"""You are VogPlus.ai's intelligent assistant. Help users understand and maximize their membership benefits.

Rules:
1. Be conversational, friendly, and concise (2-3 sentences max)
2. If benefits are relevant, mention them naturally
3. If user asks about something they don't have, suggest they might want to explore it
4. Use emojis sparingly (1-2 per response max)
5. Focus on actionable advice

User's Benefits Context:{benefits_context if benefits_context else " (No specific benefits found for this query)"}"""
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
            max_tokens=200,
        )
        
        assistant_message = response.choices[0].message.content
        
        return {
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
    
    except Exception as e:
        print(f"Error generating chat response: {e}")
        return {
            "message": "Sorry, I'm having trouble processing that right now. Please try again.",
            "related_benefits": []
        }

