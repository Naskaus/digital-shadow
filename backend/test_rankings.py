"""Test script for Rankings endpoint."""
import asyncio
import sys

import httpx

BASE_URL = "http://localhost:8001"


async def test_rankings():
    """Test Rankings endpoint."""
    async with httpx.AsyncClient() as client:
        print("=" * 60)
        print("Testing Rankings Endpoint")
        print("=" * 60)

        # Login
        print("\n[1] Login...")
        login_response = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "seb", "password": "seb12170"},
        )
        if login_response.status_code != 200:
            print(f"[X] Login failed: {login_response.text}")
            sys.exit(1)
        cookies = login_response.cookies
        print("[OK] Logged in")

        # Get rankings
        print(f"\n[2] Get rankings...")
        rankings_response = await client.get(
            f"{BASE_URL}/api/profiles/rankings",
            cookies=cookies,
        )

        if rankings_response.status_code != 200:
            print(f"[X] Failed: {rankings_response.text}")
            sys.exit(1)

        data = rankings_response.json()
        print("[OK] Rankings endpoint responded\n")

        # Display overall rankings
        print("OVERALL TOP 3:")
        print("-" * 60)
        for item in data['overall']:
            medal = 'GOLD' if item['rank'] == 1 else 'SILVER' if item['rank'] == 2 else 'BRONZE'
            print(f"  [{medal}] #{item['rank']}: {item['staff_id']}")
            print(f"          Total Profit: THB {item['total_profit']:,.2f}")
        print()

        # Display per-bar rankings
        for bar, rankings in data['by_bar'].items():
            print(f"{bar} TOP 3:")
            print("-" * 60)
            for item in rankings:
                medal = 'GOLD' if item['rank'] == 1 else 'SILVER' if item['rank'] == 2 else 'BRONZE'
                print(f"  [{medal}] #{item['rank']}: {item['staff_id']}")
                print(f"          Total Profit: THB {item['total_profit']:,.2f}")
            print()

        print("=" * 60)
        print("TEST PASSED - Rankings endpoint working!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_rankings())
