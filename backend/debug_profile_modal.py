"""Debug script for Profile Modal issues."""
import asyncio
import sys

import httpx

BASE_URL = "http://localhost:8001"


async def debug_profile_modal():
    """Debug Profile Modal issues."""
    async with httpx.AsyncClient() as client:
        print("=" * 60)
        print("DEBUGGING PROFILE MODAL")
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

        # ISSUE 1: Check profile data
        print("\n" + "=" * 60)
        print("ISSUE 1: Contact Info Section Missing")
        print("=" * 60)

        staff_id = "762 - NUENG"
        print(f"\n[2] Get profile for '{staff_id}'...")
        profile_response = await client.get(
            f"{BASE_URL}/api/profiles/staff/{staff_id}",
            cookies=cookies,
        )

        if profile_response.status_code != 200:
            print(f"[X] Failed: {profile_response.text}")
        else:
            profile = profile_response.json()
            print(f"[OK] Profile retrieved")
            print(f"\nProfile data:")
            print(f"  - ID: {profile['id']}")
            print(f"  - Name: {profile['name']}")
            print(f"  - Type: {profile['profile_type']}")
            print(f"  - Staff ID: {profile.get('staff_id')}")
            print(f"\nContact fields:")
            print(f"  - phone: {profile.get('phone')}")
            print(f"  - line_id: {profile.get('line_id')}")
            print(f"  - instagram: {profile.get('instagram')}")
            print(f"  - facebook: {profile.get('facebook')}")
            print(f"  - tiktok: {profile.get('tiktok')}")
            print(f"  - date_of_birth: {profile.get('date_of_birth')}")
            print(f"  - size: {profile.get('size')}")
            print(f"  - weight: {profile.get('weight')}")
            print(f"  - notes: {profile.get('notes')}")
            print(f"\nBars: {profile.get('bars', [])}")

            # Check if any contact fields exist
            has_contact_info = any([
                profile.get('phone'),
                profile.get('line_id'),
                profile.get('instagram'),
                profile.get('facebook'),
                profile.get('tiktok'),
                profile.get('date_of_birth'),
                profile.get('size'),
                profile.get('weight'),
            ])

            if has_contact_info:
                print("\n[!] DIAGNOSIS: Profile HAS contact data in backend")
                print("    -> Problem is likely in frontend rendering")
            else:
                print("\n[!] DIAGNOSIS: Profile has NO contact data")
                print("    -> Profile was auto-migrated without contact info")
                print("    -> Need to manually add contact data to profile")

        # ISSUE 2: Check job history
        print("\n" + "=" * 60)
        print("ISSUE 2: Job History Shows 'No job history found'")
        print("=" * 60)

        print(f"\n[3] Get job history for '{staff_id}'...")
        history_response = await client.get(
            f"{BASE_URL}/api/profiles/staff/{staff_id}/history?page=1&page_size=5",
            cookies=cookies,
        )

        if history_response.status_code != 200:
            print(f"[X] Failed: {history_response.text}")
        else:
            history = history_response.json()
            print(f"[OK] History endpoint responded")
            print(f"\nHistory data:")
            print(f"  - Total records: {history.get('total', 0)}")
            print(f"  - Page: {history.get('page')}")
            print(f"  - Page size: {history.get('page_size')}")
            print(f"  - Items returned: {len(history.get('items', []))}")

            if history.get('items'):
                print(f"\nFirst 3 records:")
                for i, item in enumerate(history['items'][:3], 1):
                    print(f"\n  Record {i}:")
                    print(f"    Date: {item.get('date')}")
                    print(f"    Bar: {item.get('bar')}")
                    print(f"    Agent: {item.get('agent_label')}")
                    print(f"    Drinks: {item.get('drinks')}")
                    print(f"    Profit: {item.get('profit')}")
            else:
                print("\n[!] DIAGNOSIS: No history items returned")

                # Check if data exists in fact_rows
                print("\n[4] Checking fact_rows directly...")
                from app.core.db import get_session
                from app.models.base import FactRow
                from sqlalchemy import select, func

                async for session in get_session():
                    # Count exact match
                    count_result = await session.execute(
                        select(func.count()).select_from(FactRow).where(FactRow.staff_id == staff_id)
                    )
                    count = count_result.scalar()
                    print(f"    Exact match count: {count}")

                    # Try partial match
                    partial_count_result = await session.execute(
                        select(func.count()).select_from(FactRow).where(FactRow.staff_id.like('%762%'))
                    )
                    partial_count = partial_count_result.scalar()
                    print(f"    Partial match (762): {partial_count}")

                    # Get some sample staff IDs
                    sample_result = await session.execute(
                        select(FactRow.staff_id).distinct().limit(10)
                    )
                    samples = sample_result.scalars().all()
                    print(f"\n    Sample staff IDs in fact_rows:")
                    for s in samples:
                        print(f"      - '{s}'")

                    break

        print("\n" + "=" * 60)
        print("DEBUG COMPLETE")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(debug_profile_modal())
