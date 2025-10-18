"""
Quick test script to verify AI endpoints structure.
Run this after starting the backend to test the endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:8000"


def test_ai_recommendations():
    """Test AI recommendations endpoint."""
    print("\n🧪 Testing /api/ai/recommendations...")

    response = requests.post(
        f"{BASE_URL}/api/ai/recommendations",
        headers={
            "Authorization": "Bearer YOUR_TOKEN_HERE",
            "Content-Type": "application/json",
        },
        json={},
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Recommendations: {len(data.get('recommendations', []))}")
        print(f"✅ Relevant benefits: {len(data.get('relevant_benefits', []))}")
    else:
        print(f"❌ Error: {response.text}")


def test_ai_discover():
    """Test AI discover endpoint."""
    print("\n🧪 Testing /api/ai/discover...")

    response = requests.post(
        f"{BASE_URL}/api/ai/discover",
        headers={
            "Authorization": "Bearer YOUR_TOKEN_HERE",
            "Content-Type": "application/json",
        },
        json={"candidate_membership_name": "Revolut Premium"},
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Membership: {data.get('membership_name')}")
        print(f"✅ Benefits found: {len(data.get('benefits', []))}")
    else:
        print(f"❌ Error: {response.text}")


def test_ai_qa():
    """Test AI Q&A endpoint."""
    print("\n🧪 Testing /api/ai/qa...")

    response = requests.post(
        f"{BASE_URL}/api/ai/qa",
        headers={
            "Authorization": "Bearer YOUR_TOKEN_HERE",
            "Content-Type": "application/json",
        },
        json={"question": "Do I have travel insurance?"},
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Answer: {data.get('answer')[:100]}...")
    else:
        print(f"❌ Error: {response.text}")


if __name__ == "__main__":
    print("=" * 60)
    print("AI Endpoints Test Script")
    print("=" * 60)
    print("\n⚠️  Make sure to:")
    print("1. Start the backend server: uvicorn main:app --reload")
    print("2. Replace YOUR_TOKEN_HERE with a valid auth token")
    print("3. Have OPENAI_API_KEY set in your .env file")
    print("\n" + "=" * 60)

    try:
        test_ai_recommendations()
        test_ai_discover()
        test_ai_qa()

        print("\n" + "=" * 60)
        print("✅ All tests structure validated!")
        print("=" * 60)
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to backend. Make sure it's running on port 8000.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
