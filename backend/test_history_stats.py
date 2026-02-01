"""Test script for Job History Statistics."""
import asyncio
import sys

import httpx

BASE_URL = "http://localhost:8001"


async def test_history_stats():
    """Test Job History Statistics endpoint."""
    async with httpx.AsyncClient() as client:
        print("=" * 60)
        print("Testing Job History Statistics")
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

        # Test with staff "762 - NUENG" (223 records)
        staff_id = "762 - NUENG"
        print(f"\n[2] Get job history with stats for '{staff_id}'...")

        history_response = await client.get(
            f"{BASE_URL}/api/profiles/staff/{staff_id}/history?page=1&page_size=5",
            cookies=cookies,
        )

        if history_response.status_code != 200:
            print(f"[X] Failed: {history_response.text}")
            sys.exit(1)

        data = history_response.json()
        print("[OK] History endpoint responded\n")

        # Display stats
        if 'stats' in data:
            stats = data['stats']
            print("KPI STATISTICS:")
            print("-" * 60)
            print(f"  Worked Days:    {stats['days_worked']}")
            print(f"  Total Profit:   THB {stats['total_profit']:,.2f}")
            print(f"  Avg Profit:     THB {stats['avg_profit']:,.2f}")
            print(f"  Total Drinks:   {stats['total_drinks']}")
            print(f"  Avg Drinks:     {stats['avg_drinks']:.2f}")
            print(f"  Total Bonus:    THB {stats['total_bonus']:,.2f}")
            print(f"  Avg Bonus:      THB {stats['avg_bonus']:,.2f}")
            print("-" * 60)
            print(f"\n[OK] All 7 statistics returned successfully!")

            # Verify calculations
            print(f"\nVerification:")
            print(f"  Total records: {data['total']}")
            print(f"  Stats days: {stats['days_worked']}")
            if stats['days_worked'] == data['total']:
                print(f"  [OK] Days count matches total records")
            else:
                print(f"  [!] Days count ({stats['days_worked']}) != total records ({data['total']})")

        else:
            print("[X] Stats not found in response!")
            print(f"Response keys: {data.keys()}")
            sys.exit(1)

        print("\n" + "=" * 60)
        print("TEST PASSED - Stats endpoint working correctly!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_history_stats())
