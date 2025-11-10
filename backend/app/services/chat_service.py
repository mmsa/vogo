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


def find_relevant_memberships(query: str, user_id: int, db: Session) -> List[Dict]:
    """
    Find relevant catalog memberships to recommend based on user query and their existing memberships.
    Uses semantic search to find memberships that match the query and considers user's existing memberships
    to personalize recommendations.
    
    Optimized to batch load data and limit API calls.
    
    Args:
        query: User's question/intent
        user_id: User's ID
        db: Database session
        
    Returns:
        List of recommended memberships with affiliate links
    """
    if not client:
        return []
    
    # Get user's current memberships to understand their preferences
    user_membership_ids = [
        um.membership_id 
        for um in db.query(UserMembership).filter(UserMembership.user_id == user_id).all()
    ]
    
    # Get catalog memberships (active, in catalog, not already owned by user)
    # Limit to first 30 to avoid processing too many
    catalog_memberships = db.query(Membership).filter(
        Membership.status == "active",
        Membership.is_catalog == True,
        ~Membership.id.in_(user_membership_ids) if user_membership_ids else True
    ).limit(30).all()
    
    if not catalog_memberships:
        return []
    
    # Batch load ALL benefits for ALL catalog memberships in one query
    catalog_membership_ids = [m.id for m in catalog_memberships]
    all_benefits = db.query(Benefit).filter(
        Benefit.membership_id.in_(catalog_membership_ids),
        Benefit.validation_status == "approved"
    ).all()
    
    # Group benefits by membership_id for fast lookup
    benefits_by_membership = {}
    for benefit in all_benefits:
        if benefit.membership_id not in benefits_by_membership:
            benefits_by_membership[benefit.membership_id] = []
        benefits_by_membership[benefit.membership_id].append(benefit)
    
    # Get query embedding once (single API call)
    query_embedding = get_embedding(query)
    if not query_embedding:
        return []
    
    # Pre-filter: Simple keyword matching to reduce expensive semantic searches
    query_lower = query.lower()
    query_keywords = set(query_lower.split())
    
    # First pass: keyword matching to score memberships
    keyword_matched = []
    for membership in catalog_memberships:
        benefits = benefits_by_membership.get(membership.id, [])
        if not benefits:
            continue
        
        # Count keyword matches in benefit titles/descriptions
        keyword_score = 0
        for benefit in benefits:
            benefit_text_lower = f"{benefit.title} {benefit.description or ''}".lower()
            for keyword in query_keywords:
                if len(keyword) > 3 and keyword in benefit_text_lower:
                    keyword_score += 1
        
        if keyword_score > 0:
            keyword_matched.append({
                "membership": membership,
                "benefits": benefits,
                "keyword_score": keyword_score
            })
    
    # Sort by keyword score and only do semantic search on top 5
    keyword_matched.sort(key=lambda x: x["keyword_score"], reverse=True)
    top_keyword_matches = keyword_matched[:5]  # Only top 5 for semantic search
    
    if not top_keyword_matches:
        return []
    
    # Now do expensive semantic search only on top keyword matches
    recommendations = []
    for match in top_keyword_matches:
        membership = match["membership"]
        benefits = match["benefits"]
        
        relevant_benefits = []
        for benefit in benefits[:10]:  # Limit to first 10 benefits per membership
            benefit_text = create_benefit_text(benefit, membership)
            benefit_embedding = get_embedding(benefit_text)
            
            if benefit_embedding:
                similarity = cosine_similarity(query_embedding, benefit_embedding)
                if similarity >= 0.5:  # Threshold for relevance
                    relevant_benefits.append({
                        "title": benefit.title,
                        "description": benefit.description,
                        "category": benefit.category,
                        "similarity_score": round(similarity, 3),
                    })
        
        if relevant_benefits:
            # Sort by similarity
            relevant_benefits.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            # Build affiliate URL with affiliate_id if available
            affiliate_url = membership.affiliate_url
            if affiliate_url and membership.affiliate_id:
                # Append affiliate_id to URL if not already present
                separator = "&" if "?" in affiliate_url else "?"
                affiliate_url = f"{affiliate_url}{separator}affiliate_id={membership.affiliate_id}"
            
            recommendations.append({
                "membership_id": membership.id,
                "membership_name": membership.name,
                "provider_name": membership.provider_name,
                "plan_name": membership.plan_name,
                "provider_slug": membership.provider_slug,
                "affiliate_url": affiliate_url,
                "affiliate_id": membership.affiliate_id,
                "matching_benefits": relevant_benefits[:3],  # Top 3 benefits
                "total_matching": len(relevant_benefits),
                "best_match_score": relevant_benefits[0]["similarity_score"]
            })
    
    # Sort by best match score
    recommendations.sort(key=lambda x: x["best_match_score"], reverse=True)
    return recommendations[:3]  # Top 3 recommendations


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
    
    # If no matching benefits found, find relevant catalog memberships to recommend
    recommended_memberships = []
    if not relevant_benefits and user_id:
        recommended_memberships = find_relevant_memberships(user_message, user_id, db)
    
    # Build context for LLM
    benefits_context = ""
    if relevant_benefits:
        benefits_context = "\n\n✅ EXISTING BENEFITS (User already has these):\n"
        for b in relevant_benefits:
            benefits_context += f"- {b['benefit_title']} from {b['membership_name']}"
            if b.get('benefit_description'):
                benefits_context += f": {b['benefit_description']}"
            benefits_context += f" [Relevance: {int(b['similarity_score']*100)}%]\n"
            if b.get('vendor_domain'):
                benefits_context += f"  🌐 Available at: {b['vendor_domain']}\n"
            if b.get('benefit_id'):
                benefits_context += f"  🔗 Benefit ID: {b['benefit_id']}\n"
    
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
    
    recommended_memberships_context = ""
    if recommended_memberships:
        recommended_memberships_context = "\n\n💡 RECOMMENDED MEMBERSHIPS (Based on your query):\n"
        for rec in recommended_memberships:
            recommended_memberships_context += f"\n📦 {rec['membership_name']}"
            if rec.get('provider_name'):
                recommended_memberships_context += f" by {rec['provider_name']}"
            if rec.get('plan_name'):
                recommended_memberships_context += f" ({rec['plan_name']})"
            recommended_memberships_context += f"\n  Matches your query with {rec['total_matching']} benefit(s):\n"
            
            for benefit in rec['matching_benefits']:
                recommended_memberships_context += f"  • {benefit['title']}"
                if benefit.get('description'):
                    recommended_memberships_context += f": {benefit['description']}"
                recommended_memberships_context += f" [Match: {int(benefit['similarity_score']*100)}%]\n"
            if rec.get('affiliate_url'):
                recommended_memberships_context += f"  🔗 Affiliate URL: {rec['affiliate_url']}\n"
                recommended_memberships_context += f"  ⚠️ IMPORTANT: You MUST include this exact affiliate link in your response when recommending this membership!\n"
    
    # Build intelligent system prompt
    system_prompt = f"""You are vogoplus.app's intelligent benefits assistant. Your goal is to help users save money and maximize their membership benefits.

CRITICAL RULES:
1. **If user already has relevant benefits**: ALWAYS mention the SPECIFIC membership name(s) that provide the benefit. Example: "You have Travel Insurance included with your Revolut Premium membership" or "Your Lloyds Platinum account includes Travel Insurance and AA Breakdown Cover."
2. **Be specific**: Always name the membership(s) and the exact benefit title. Never say "your memberships" - say "your [Membership Name] membership".
3. **If buying intent detected AND upgrades available**: Suggest the upgrade could save them money. Mention the specific benefit and membership name.
4. **If buying intent BUT already covered**: Emphasize they don't need to buy anything - they already have it! Name the membership(s).
5. **If no existing benefits found BUT recommended memberships available**: Suggest the recommended membership(s) that match their query. Mention the key benefits. ALWAYS include the affiliate link provided in the context - use the exact URL from the "Affiliate URL" field. Format it naturally in your response (e.g., "Check it out here: [affiliate URL]" or "Learn more: [affiliate URL]"). Be conversational and helpful.
6. **Always be conversational and concise** (2-3 sentences max)
7. **Use emojis sparingly** (1-2 max)
8. **Focus on SAVING MONEY** - that's why they're talking to you
9. **Mention benefit details**: If a benefit description is provided, briefly reference it (e.g., "worldwide travel insurance" or "breakdown cover")

User's Question Intent: {"🛒 BUYING/SUBSCRIBING" if has_buying_intent else "ℹ️ General inquiry"}

{benefits_context if benefits_context else "❌ No existing benefits match this query"}
{upgrade_context if upgrade_context else ""}
{recommended_memberships_context if recommended_memberships_context else ""}

Your Response Strategy:
- If they have matching benefits: Say "You have [Benefit Name] included with your [Membership Name] membership" - ALWAYS name the membership!
- If multiple memberships provide the same benefit: List them all (e.g., "You have Travel Insurance with both your Revolut Premium and Lloyds Platinum memberships")
- If upgrade would help: Say "Consider upgrading to [membership name] for [specific benefit]"
- If no existing benefits BUT recommended memberships available: Say "I found [membership name] which offers [key benefit 1] and [key benefit 2]. This could be a great fit for your needs! [Include the affiliate URL from the context]"
- If neither: Provide general helpful advice

EXAMPLE GOOD RESPONSES:
- "You have Travel Insurance included with your Revolut Premium membership, which covers trips up to 45 days worldwide."
- "You already have breakdown cover! Your Lloyds Platinum account includes AA Breakdown Cover, so you don't need to buy it separately."
- "You have Travel Insurance with both your Revolut Premium and Lloyds Platinum memberships - you're fully covered!"
- "I found Revolut Premium which offers travel insurance and airport lounge access. This could be a great fit for your travel needs! Check it out here: https://revolut.com/premium?affiliate_id=12345"

EXAMPLE BAD RESPONSES (DO NOT DO THIS):
- "You already have travel insurance included in your memberships!" (too vague - doesn't name the membership)
- "You have this benefit!" (doesn't specify what or from where)
- "You currently don't have any specific benefits related to SIM deals in your memberships." (too negative - should suggest alternatives)"""
    
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
        
        # Build response with benefits, upgrades, and recommended memberships
        response_data = {
            "message": assistant_message,
            "related_benefits": [
                {
                    "id": b["benefit_id"],
                    "title": b["benefit_title"],
                    "membership_name": b["membership_name"]
                }
                for b in relevant_benefits[:3]  # Top 3 only
            ],
            "recommended_memberships": [
                {
                    "membership_id": rec["membership_id"],
                    "membership_name": rec["membership_name"],
                    "provider_name": rec.get("provider_name"),
                    "plan_name": rec.get("plan_name"),
                    "provider_slug": rec.get("provider_slug"),
                    "affiliate_url": rec.get("affiliate_url"),
                    "matching_benefits": rec.get("matching_benefits", [])
                }
                for rec in recommended_memberships[:3]  # Top 3 only
            ] if recommended_memberships else []
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


