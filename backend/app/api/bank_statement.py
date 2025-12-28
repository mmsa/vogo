"""Bank statement upload and processing API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.db import get_db
from app.core.auth import get_current_user
from app.models import User, Membership, UserMembership
from app.services.bank_statement_parser import parse_bank_statement
from app.services.ingest_unknown import ingest_unknown_membership
from app.services.llm_validate_membership import validate_membership_with_gpt
from app.services.membership_tiers import get_plan_tier
from rapidfuzz import fuzz
import re

router = APIRouter(prefix="/api/bank-statement", tags=["bank-statement"])


def normalize_name(name: str) -> str:
    """Normalize membership name for comparison."""
    # Remove common suffixes, convert to lowercase
    name = re.sub(r'\s+(premium|pro|plus|standard|basic|tier|plan|subscription|membership)$', '', name, flags=re.IGNORECASE)
    return name.lower().strip()


def find_matching_membership(
    db: Session,
    subscription_name: str,
    threshold: int = 80
) -> Membership | None:
    """
    Find existing membership that matches subscription name.
    
    Uses fuzzy matching to find similar memberships.
    """
    all_memberships = db.query(Membership).filter(Membership.status == "active").all()
    
    normalized_subscription = normalize_name(subscription_name)
    
    best_match = None
    best_score = 0
    
    for membership in all_memberships:
        # Try matching against name, provider_name, and provider_slug
        scores = [
            fuzz.ratio(normalized_subscription, normalize_name(membership.name)),
            fuzz.ratio(normalized_subscription, normalize_name(membership.provider_name or "")),
            fuzz.ratio(normalized_subscription, normalize_name(membership.provider_slug or "")),
        ]
        
        max_score = max(scores)
        if max_score > best_score and max_score >= threshold:
            best_score = max_score
            best_match = membership
    
    return best_match if best_score >= threshold else None


async def process_subscription(
    db: Session,
    user_id: int,
    subscription: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Process a single subscription: validate, check if exists, then discover benefits if needed.
    
    Flow:
    1. Check if membership exists in catalog (fuzzy match)
    2. If exists, check if user already has it
    3. If user has it, skip
    4. If exists but user doesn't have it, link it (no LLM needed)
    5. If doesn't exist, validate with GPT first
    6. If valid, use LLM to discover benefits
    7. If invalid, create basic membership without benefits
    
    Returns:
        Dict with membership info and action taken
    """
    membership_name = subscription['membership_name']
    amount = subscription['amount']
    
    # Step 1: Try to find existing membership in catalog (fuzzy match)
    existing_membership = find_matching_membership(db, membership_name)
    
    if existing_membership:
        # Step 2: Check if user already has this membership
        existing_user_membership = (
            db.query(UserMembership)
            .filter(
                UserMembership.user_id == user_id,
                UserMembership.membership_id == existing_membership.id
            )
            .first()
        )
        
        if existing_user_membership:
            return {
                'membership_id': existing_membership.id,
                'membership_name': existing_membership.name,
                'action': 'already_exists',
                'amount': amount,
            }
        
        # Step 3: Link existing membership to user (no LLM needed - benefits already exist)
        user_membership = UserMembership(
            user_id=user_id,
            membership_id=existing_membership.id,
            notes=f"Auto-added from bank statement (£{amount:.2f}/{subscription.get('frequency', 'month')})"
        )
        db.add(user_membership)
        db.commit()
        
        return {
            'membership_id': existing_membership.id,
            'membership_name': existing_membership.name,
            'action': 'linked_existing',
            'amount': amount,
        }
    
    # Step 4: Membership doesn't exist - validate first before using LLM
    print(f"🔍 Validating membership '{membership_name}' before benefit discovery...")
    validation_result = validate_membership_with_gpt(db, membership_name)
    
    # Check if validation found it exists (exact match in catalog)
    if validation_result.get('status') == 'exists':
        existing_membership = db.query(Membership).filter(
            Membership.id == validation_result['existing_membership']['id']
        ).first()
        
        if existing_membership:
            # Check if user already has it
            existing_user_membership = (
                db.query(UserMembership)
                .filter(
                    UserMembership.user_id == user_id,
                    UserMembership.membership_id == existing_membership.id
                )
                .first()
            )
            
            if not existing_user_membership:
                user_membership = UserMembership(
                    user_id=user_id,
                    membership_id=existing_membership.id,
                    notes=f"Auto-added from bank statement (£{amount:.2f}/{subscription.get('frequency', 'month')})"
                )
                db.add(user_membership)
                db.commit()
                
                return {
                    'membership_id': existing_membership.id,
                    'membership_name': existing_membership.name,
                    'action': 'linked_existing',
                    'amount': amount,
                }
            else:
                return {
                    'membership_id': existing_membership.id,
                    'membership_name': existing_membership.name,
                    'action': 'already_exists',
                    'amount': amount,
                }
    
    # Step 5: Check validation status - only proceed if valid
    if validation_result.get('status') not in ['valid', 'ambiguous']:
        # Invalid membership - create basic membership without benefits
        print(f"❌ Membership '{membership_name}' is invalid: {validation_result.get('reason', 'Unknown reason')}")
        provider_name = membership_name.split()[0] if membership_name.split() else membership_name
        plan_name = " ".join(membership_name.split()[1:]) if len(membership_name.split()) > 1 else "Standard"
        provider_slug = re.sub(r'[^a-z0-9]+', '-', membership_name.lower()).strip('-')
        
        membership = Membership(
            name=membership_name,
            provider_slug=provider_slug,
            provider_name=provider_name,
            plan_name=plan_name,
            plan_tier=get_plan_tier(provider_name, plan_name),
            is_catalog=False,  # Not in catalog - invalid/too vague
            status="active",
            discovered_by_user_id=user_id,
        )
        db.add(membership)
        db.flush()
        
        # Link to user
        user_membership = UserMembership(
            user_id=user_id,
            membership_id=membership.id,
            notes=f"Auto-added from bank statement (£{amount:.2f}/{subscription.get('frequency', 'month')}) - validation: {validation_result.get('reason', 'invalid')}"
        )
        db.add(user_membership)
        db.commit()
        
        return {
            'membership_id': membership.id,
            'membership_name': membership_name,
            'action': 'created_basic_invalid',
            'amount': amount,
            'validation_reason': validation_result.get('reason'),
        }
    
    # Step 6: Valid membership - use LLM to discover benefits
    print(f"✅ Membership '{membership_name}' is valid - discovering benefits with LLM...")
    try:
        # Use normalized name if available, otherwise use original
        name_to_use = validation_result.get('normalized_name') or membership_name
        result = ingest_unknown_membership(db, user_id, name_to_use)
        
        # Link to user (ingest_unknown_membership might already do this, but ensure it)
        membership_id = result['membership']['id']
        existing_link = (
            db.query(UserMembership)
            .filter(
                UserMembership.user_id == user_id,
                UserMembership.membership_id == membership_id
            )
            .first()
        )
        
        if not existing_link:
            user_membership = UserMembership(
                user_id=user_id,
                membership_id=membership_id,
                notes=f"Auto-added from bank statement (£{amount:.2f}/{subscription.get('frequency', 'month')})"
            )
            db.add(user_membership)
            db.commit()
        
        return {
            'membership_id': membership_id,
            'membership_name': name_to_use,
            'action': 'created_new',
            'amount': amount,
            'benefits_found': result.get('benefits_found', False),
        }
    except Exception as e:
        # If ingestion fails, create a basic membership
        print(f"❌ Failed to ingest {membership_name}: {e}")
        
        # Create basic membership
        provider_name = membership_name.split()[0] if membership_name.split() else membership_name
        plan_name = " ".join(membership_name.split()[1:]) if len(membership_name.split()) > 1 else "Standard"
        provider_slug = re.sub(r'[^a-z0-9]+', '-', membership_name.lower()).strip('-')
        
        membership = Membership(
            name=membership_name,
            provider_slug=provider_slug,
            provider_name=provider_name,
            plan_name=plan_name,
            plan_tier=get_plan_tier(provider_name, plan_name),
            is_catalog=False,  # Not in catalog yet
            status="active",
            discovered_by_user_id=user_id,
        )
        db.add(membership)
        db.flush()
        
        # Link to user
        user_membership = UserMembership(
            user_id=user_id,
            membership_id=membership.id,
            notes=f"Auto-added from bank statement (£{amount:.2f}/{subscription.get('frequency', 'month')}) - ingestion failed: {str(e)}"
        )
        db.add(user_membership)
        db.commit()
        
        return {
            'membership_id': membership.id,
            'membership_name': membership_name,
            'action': 'created_basic',
            'amount': amount,
        }


@router.post("/upload")
async def upload_bank_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Upload and process a bank statement PDF.
    
    Extracts recurring subscriptions and automatically adds them to user's account.
    """
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Read file content
    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    # Parse bank statement
    try:
        result = parse_bank_statement(file_content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse bank statement: {str(e)}")
    
    # Process each subscription
    processed_subscriptions = []
    errors = []
    
    for subscription in result['subscriptions']:
        try:
            processed = await process_subscription(db, current_user.id, subscription)
            processed_subscriptions.append(processed)
        except Exception as e:
            errors.append({
                'subscription': subscription['membership_name'],
                'error': str(e)
            })
    
    return {
        'summary': result['summary'],
        'subscriptions_found': len(result['subscriptions']),
        'subscriptions_processed': len(processed_subscriptions),
        'processed': processed_subscriptions,
        'errors': errors,
        'message': f"Found {len(result['subscriptions'])} subscriptions. Added {len(processed_subscriptions)} to your account."
    }

