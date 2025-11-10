#!/usr/bin/env python3
"""Test if AA/breakdown benefits are detected on theaa.com"""

import requests
import json
import sys

# Configuration
API_BASE = "http://localhost:8000"
EMAIL = "admin@vogoplus.app"
PASSWORD = "ChangeMe123!"


def test_aa_recommendations():
    print("🧪 Testing AA Recommendations\n")

    # Step 1: Login
    print("1️⃣ Logging in...")
    try:
        login_response = requests.post(
            f"{API_BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}
        )
        login_response.raise_for_status()
        token = login_response.json()["access_token"]
        print("✅ Logged in successfully\n")
    except Exception as e:
        print(f"❌ Login failed: {e}")
        print("💡 Update EMAIL and PASSWORD in this script")
        return

    # Step 2: Check user's memberships
    print("2️⃣ Checking user memberships...")
    try:
        memberships_response = requests.get(
            f"{API_BASE}/api/memberships/mine",
            headers={"Authorization": f"Bearer {token}"},
        )
        memberships_response.raise_for_status()
        memberships = memberships_response.json()
        print(f"   Found {len(memberships)} memberships:")
        for m in memberships:
            print(f"   - {m.get('membership', {}).get('name', 'Unknown')}")
        print()
    except Exception as e:
        print(f"❌ Failed to get memberships: {e}\n")

    # Step 3: Get recommendations for theaa.com
    print("3️⃣ Testing recommendations for www.theaa.com...")
    try:
        recs_response = requests.post(
            f"{API_BASE}/api/ai/recommendations",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"domain": "www.theaa.com"},
        )
        recs_response.raise_for_status()
        recs_data = recs_response.json()

        recommendations = recs_data.get("recommendations", [])
        print(f"   ✅ Got {len(recommendations)} recommendations\n")

        if recommendations:
            print("📋 Recommendations:")
            for i, rec in enumerate(recommendations, 1):
                print(f"\n   {i}. {rec.get('title')}")
                print(f"      Type: {rec.get('kind')}")
                print(f"      Rationale: {rec.get('rationale')}")
                if rec.get("estimated_saving_min"):
                    print(
                        f"      Savings: £{rec.get('estimated_saving_min')}-£{rec.get('estimated_saving_max', rec.get('estimated_saving_min'))}"
                    )
        else:
            print("   ⚠️  No recommendations returned")
            print("   This might mean:")
            print("   - User has no AA or breakdown-related benefits")
            print("   - Benefits are not approved yet")
            print("   - AI didn't detect relevant matches")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        if hasattr(e, "response"):
            print(f"   Response: {e.response.text}")

    # Step 4: Check breakdown benefits
    print("\n4️⃣ Checking breakdown-related benefits...")
    try:
        benefits_response = requests.get(
            f"{API_BASE}/api/benefits", headers={"Authorization": f"Bearer {token}"}
        )
        benefits_response.raise_for_status()
        benefits = benefits_response.json()

        breakdown_benefits = [
            b
            for b in benefits
            if b.get("category") == "breakdown_cover"
            or "AA" in b.get("membership_name", "")
            or "breakdown" in b.get("title", "").lower()
        ]

        print(f"   Found {len(breakdown_benefits)} breakdown-related benefits:")
        for b in breakdown_benefits[:5]:
            print(f"   - {b.get('title')} ({b.get('membership_name')})")
            print(f"     Status: {b.get('validation_status')}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")

    print("\n✅ Test complete!")


if __name__ == "__main__":
    test_aa_recommendations()
