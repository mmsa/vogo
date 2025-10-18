#!/usr/bin/env python3
"""Setup admin user with AA membership via API"""

import requests
import json

API_BASE = "http://localhost:8000"
EMAIL = "admin@vogo.app"
PASSWORD = "ChangeMe123!"


def main():
    print("🔧 Setting up admin user with AA membership\n")

    # Step 1: Login
    print("1️⃣ Logging in...")
    login_response = requests.post(
        f"{API_BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}
    )
    if not login_response.ok:
        print(f"❌ Login failed: {login_response.text}")
        return

    token = login_response.json()["access_token"]
    print("✅ Logged in\n")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Step 2: Check available memberships
    print("2️⃣ Finding AA membership...")
    memberships_response = requests.get(f"{API_BASE}/api/memberships", headers=headers)

    if not memberships_response.ok:
        print(f"❌ Failed to get memberships: {memberships_response.text}")
        return

    memberships = memberships_response.json()
    aa_membership = next(
        (m for m in memberships if "aa" in m.get("provider_slug", "").lower()), None
    )

    if not aa_membership:
        print("❌ AA membership not found in catalog")
        print("Available memberships:")
        for m in memberships[:10]:
            print(f"   - {m.get('name')} ({m.get('provider_slug')})")
        return

    print(f"✅ Found: {aa_membership['name']} (ID: {aa_membership['id']})\n")

    # Step 3: Add membership to user
    print("3️⃣ Adding AA membership to admin user...")
    add_response = requests.post(
        f"{API_BASE}/api/user-memberships",
        headers=headers,
        json={"membership_id": aa_membership["id"], "status": "active"},
    )

    if not add_response.ok:
        if (
            add_response.status_code == 400
            and "already exists" in add_response.text.lower()
        ):
            print("⚠️  Membership already added")
        else:
            print(f"❌ Failed to add membership: {add_response.text}")
            return
    else:
        print("✅ Added AA membership to admin\n")

    # Step 4: Test recommendations
    print("4️⃣ Testing recommendations for www.theaa.com...")
    recs_response = requests.post(
        f"{API_BASE}/api/ai/recommendations",
        headers=headers,
        json={"domain": "www.theaa.com"},
    )

    if not recs_response.ok:
        print(f"❌ Failed: {recs_response.text}")
        return

    recs_data = recs_response.json()
    recommendations = recs_data.get("recommendations", [])

    print(f"✅ Got {len(recommendations)} recommendations\n")

    if recommendations:
        print("📋 Recommendations for www.theaa.com:")
        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. {rec.get('title')}")
            print(f"   Type: {rec.get('kind')}")
            print(f"   {rec.get('rationale')}")
    else:
        print("⚠️  No recommendations yet")
        print("This may take a moment for the AI to process...")

    print("\n🎉 Setup complete!")
    print("📍 Now test the Chrome extension on www.theaa.com/breakdown-cover/")


if __name__ == "__main__":
    main()
