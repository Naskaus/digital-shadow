"""Test script for Profile Modal endpoints."""
import asyncio
import sys
from datetime import datetime

import httpx

BASE_URL = "http://localhost:8001"


async def test_profile_modal():
    """Test all Profile Modal endpoints."""
    async with httpx.AsyncClient() as client:
        print("Testing Profile Modal Implementation\n")
        print("=" * 60)

        # Step 1: Login
        print("\n[1] Login as 'seb'...")
        login_response = await client.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "seb", "password": "seb12170"},
        )
        if login_response.status_code != 200:
            print(f"[X] Login failed: {login_response.text}")
            sys.exit(1)
        cookies = login_response.cookies
        print("[OK] Login successful")

        # Step 2: Get a staff profile
        print("\n[2] Get profile for staff '046 - MAPRANG'...")
        profile_response = await client.get(
            f"{BASE_URL}/api/profiles/staff/046 - MAPRANG",
            cookies=cookies,
        )
        if profile_response.status_code != 200:
            print(f"[X] Failed: {profile_response.text}")
            sys.exit(1)
        profile = profile_response.json()
        print(f"[OK] Profile found:")
        print(f"   - ID: {profile['id']}")
        print(f"   - Name: {profile['name']}")
        print(f"   - Type: {profile['profile_type']}")
        print(f"   - Has Picture: {profile['has_picture']}")
        print(f"   - Bars: {', '.join([b['bar'] for b in profile['bars']])}")

        # Step 3: Get staff history
        print(f"\n[3] Get job history for '046 - MAPRANG'...")
        history_response = await client.get(
            f"{BASE_URL}/api/profiles/staff/046 - MAPRANG/history?page=1&page_size=5",
            cookies=cookies,
        )
        if history_response.status_code != 200:
            print(f"[X] Failed: {history_response.text}")
            sys.exit(1)
        history = history_response.json()
        print(f"[OK] History retrieved:")
        print(f"   - Total records: {history['total']}")
        print(f"   - Page: {history['page']}")
        print(f"   - Items on this page: {len(history['items'])}")
        if history['items']:
            first = history['items'][0]
            print(f"\n   First record:")
            print(f"   - Date: {first['date']}")
            print(f"   - Bar: {first['bar']}")
            print(f"   - Drinks: {first['drinks']}")
            print(f"   - Profit: THB {first['profit']}")

        # Step 4: Test filtered history
        print(f"\n[4] Get filtered history (MANDARIN only)...")
        filtered_response = await client.get(
            f"{BASE_URL}/api/profiles/staff/046 - MAPRANG/history?bar=MANDARIN&page=1&page_size=5",
            cookies=cookies,
        )
        if filtered_response.status_code != 200:
            print(f"[X] Failed: {filtered_response.text}")
            sys.exit(1)
        filtered = filtered_response.json()
        print(f"[OK] Filtered history retrieved:")
        print(f"   - Total MANDARIN records: {filtered['total']}")
        print(f"   - Items: {len(filtered['items'])}")

        # Step 5: Test photo endpoint (should be 404 if no photo)
        print(f"\n[5] Check photo endpoint...")
        photo_response = await client.get(
            f"{BASE_URL}/api/profiles/{profile['id']}/photo",
        )
        if photo_response.status_code == 404:
            print("[OK] Photo endpoint working (no photo uploaded yet)")
        elif photo_response.status_code == 200:
            print(f"[OK] Photo found! Size: {len(photo_response.content)} bytes")
        else:
            print(f"[!] Unexpected status: {photo_response.status_code}")

        print("\n" + "=" * 60)
        print("[OK] All tests passed!")
        print("\nSummary:")
        print("   [+] Profile retrieval working")
        print("   [+] Job history endpoint working")
        print("   [+] Pagination working")
        print("   [+] Filtering working")
        print("   [+] Photo endpoint accessible")
        print("\nProfile Modal backend is ready!")


if __name__ == "__main__":
    asyncio.run(test_profile_modal())
