#!/usr/bin/env python3
"""
Test semantic matching feature.

This demonstrates the new smart matching that:
1. Scrapes page metadata
2. Uses embeddings for semantic search
3. Generates AI-powered user messages
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.db import SessionLocal
from app.models import User, UserMembership, Membership, Benefit
from app.services.page_scraper import scrape_page_metadata, metadata_to_text
from app.services.semantic_matcher import (
    find_semantic_matches,
    generate_user_message,
    get_embedding,
    cosine_similarity,
)


async def test_semantic_matching():
    """Test the semantic matching pipeline."""

    print("=" * 80)
    print("SEMANTIC MATCHING TEST")
    print("=" * 80)

    # Test URLs
    test_cases = [
        "https://www.theaa.com/breakdown-cover",
        "https://www.o2.co.uk/shop/phones",
        "https://www.primevideo.com",
        "https://www.tesco.com",  # Should NOT match (user doesn't have Tesco)
    ]

    db = SessionLocal()

    # Get test user (test@vogoplus.app)
    user = db.query(User).filter(User.email == "test@vogoplus.app").first()
    if not user:
        print("❌ test@vogoplus.app user not found!")
        return

    print(f"\n✅ Testing with user: {user.email} (ID: {user.id})")

    # Get user's benefits
    user_memberships = (
        db.query(UserMembership).filter(UserMembership.user_id == user.id).all()
    )

    membership_ids = [um.membership_id for um in user_memberships]

    benefits_with_membership = []
    for membership_id in membership_ids:
        membership = db.query(Membership).get(membership_id)
        if membership:
            benefits = (
                db.query(Benefit)
                .filter(
                    Benefit.membership_id == membership_id,
                    Benefit.validation_status == "approved",
                )
                .all()
            )

            for benefit in benefits:
                benefits_with_membership.append((benefit, membership))

    print(
        f"   Found {len(benefits_with_membership)} approved benefits across {len(user_memberships)} memberships"
    )

    # Test each URL
    for url in test_cases:
        print("\n" + "-" * 80)
        print(f"🌐 Testing: {url}")
        print("-" * 80)

        # Step 1: Scrape metadata
        print("\n1️⃣ Scraping page metadata...")
        metadata = await scrape_page_metadata(url, timeout=5)

        if "error" in metadata:
            print(f"   ❌ Error: {metadata['error']}")
            continue

        print(f"   ✅ Domain: {metadata.get('domain')}")
        print(f"   ✅ Title: {metadata.get('title')[:80]}")
        print(f"   ✅ Description: {(metadata.get('description') or '')[:100]}")

        # Step 2: Semantic matching
        print("\n2️⃣ Finding semantic matches...")
        matches = await find_semantic_matches(
            metadata, benefits_with_membership, top_k=3, threshold=0.6
        )

        print(f"   ✅ Found {len(matches)} matches above 60% threshold")

        for i, match in enumerate(matches, 1):
            print(f"\n   Match #{i}:")
            print(f"     • Membership: {match['membership'].name}")
            print(f"     • Benefit: {match['benefit'].title}")
            print(f"     • Similarity: {match['similarity_score']:.1%}")

        # Step 3: Generate AI message
        print("\n3️⃣ Generating AI message...")
        result = await generate_user_message(metadata, matches)

        if result["has_matches"]:
            print(f"   ✅ Message: {result['message']}")
            print(f"   ✅ Action: {result['action']}")
            print(f"   ✅ Highlight Benefits: {result['highlight_benefit_ids']}")
        else:
            print(f"   ℹ️  {result['message']}")

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

    # Test direct embedding similarity
    print("\n🧪 BONUS: Direct embedding comparison test")
    print("-" * 80)

    text1 = "AA roadside breakdown assistance and recovery"
    text2 = "The AA breakdown cover page"
    text3 = "Amazon Prime Video streaming service"

    emb1 = get_embedding(text1)
    emb2 = get_embedding(text2)
    emb3 = get_embedding(text3)

    sim_12 = cosine_similarity(emb1, emb2)
    sim_13 = cosine_similarity(emb1, emb3)

    print(f"Similarity between:")
    print(f"  '{text1}'")
    print(f"  and")
    print(f"  '{text2}'")
    print(f"  = {sim_12:.1%} ✅ (should be HIGH)")
    print()
    print(f"Similarity between:")
    print(f"  '{text1}'")
    print(f"  and")
    print(f"  '{text3}'")
    print(f"  = {sim_13:.1%} ❌ (should be LOW)")


if __name__ == "__main__":
    asyncio.run(test_semantic_matching())
