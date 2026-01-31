"""Test script for Contract Types API endpoints."""
import sys
import requests

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8001/api"


def test_contracts_api():
    """Test all contract type endpoints."""
    session = requests.Session()

    # Step 1: Login to get auth cookie
    print("=" * 60)
    print("STEP 1: Authentication")
    print("=" * 60)

    login_response = session.post(
        f"{BASE_URL}/auth/login",
        json={"username": "seb", "password": "seb12170"}
    )

    if login_response.status_code == 200:
        print("✓ Login successful")
        print(f"  Response: {login_response.json()}")
    else:
        print(f"✗ Login failed: {login_response.status_code}")
        print(f"  Error: {login_response.text}")
        return

    print()

    # Step 2: Create a new contract type
    print("=" * 60)
    print("STEP 2: POST /api/contracts - Create 1-Day contract")
    print("=" * 60)

    contract_data = {
        "name": "1-Day",
        "duration_days": 1,
        "late_cutoff_time": "19:29:00",
        "first_minute_penalty_thb": 0.0,
        "additional_minutes_penalty_thb": 5.0,
        "drink_price_thb": 220.0,
        "staff_commission_thb": 100.0,
        "is_active": True
    }

    create_response = session.post(
        f"{BASE_URL}/contracts",
        json=contract_data
    )

    if create_response.status_code == 201:
        created_contract = create_response.json()
        contract_id = created_contract["id"]
        print("✓ Contract created successfully")
        print(f"  ID: {contract_id}")
        print(f"  Name: {created_contract['name']}")
        print(f"  Drink Price: {created_contract['drink_price_thb']} THB")
    else:
        print(f"✗ Create failed: {create_response.status_code}")
        print(f"  Error: {create_response.text}")
        return

    print()

    # Step 3: List all contract types
    print("=" * 60)
    print("STEP 3: GET /api/contracts - List all contracts")
    print("=" * 60)

    list_response = session.get(f"{BASE_URL}/contracts")

    if list_response.status_code == 200:
        contracts = list_response.json()
        print(f"✓ Retrieved {len(contracts)} contract(s)")
        for contract in contracts:
            print(f"  - {contract['name']} (ID: {contract['id']})")
    else:
        print(f"✗ List failed: {list_response.status_code}")
        print(f"  Error: {list_response.text}")

    print()

    # Step 4: Get single contract by ID
    print("=" * 60)
    print(f"STEP 4: GET /api/contracts/{contract_id} - Get by ID")
    print("=" * 60)

    get_response = session.get(f"{BASE_URL}/contracts/{contract_id}")

    if get_response.status_code == 200:
        contract = get_response.json()
        print("✓ Contract retrieved successfully")
        print(f"  Name: {contract['name']}")
        print(f"  Duration: {contract['duration_days']} day(s)")
        print(f"  Late cutoff: {contract['late_cutoff_time']}")
        print(f"  Drink price: {contract['drink_price_thb']} THB")
        print(f"  Staff commission: {contract['staff_commission_thb']} THB")
    else:
        print(f"✗ Get failed: {get_response.status_code}")
        print(f"  Error: {get_response.text}")

    print()

    # Step 5: Update contract (change drink price)
    print("=" * 60)
    print(f"STEP 5: PATCH /api/contracts/{contract_id} - Update drink price")
    print("=" * 60)

    update_data = {"drink_price_thb": 240.0}

    update_response = session.patch(
        f"{BASE_URL}/contracts/{contract_id}",
        json=update_data
    )

    if update_response.status_code == 200:
        updated_contract = update_response.json()
        print("✓ Contract updated successfully")
        print(f"  Old price: 220.0 THB")
        print(f"  New price: {updated_contract['drink_price_thb']} THB")
    else:
        print(f"✗ Update failed: {update_response.status_code}")
        print(f"  Error: {update_response.text}")

    print()

    # Step 6: Delete contract
    print("=" * 60)
    print(f"STEP 6: DELETE /api/contracts/{contract_id} - Delete contract")
    print("=" * 60)

    delete_response = session.delete(f"{BASE_URL}/contracts/{contract_id}")

    if delete_response.status_code == 204:
        print("✓ Contract deleted successfully")
    else:
        print(f"✗ Delete failed: {delete_response.status_code}")
        print(f"  Error: {delete_response.text}")

    print()

    # Step 7: Verify deletion
    print("=" * 60)
    print("STEP 7: Verify deletion")
    print("=" * 60)

    verify_response = session.get(f"{BASE_URL}/contracts/{contract_id}")

    if verify_response.status_code == 404:
        print("✓ Contract successfully deleted (404 Not Found)")
    else:
        print(f"✗ Contract still exists: {verify_response.status_code}")

    print()
    print("=" * 60)
    print("All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        test_contracts_api()
    except requests.exceptions.ConnectionError:
        print("✗ ERROR: Could not connect to http://localhost:8001")
        print("  Make sure the backend server is running:")
        print("  cd backend && uvicorn app.main:app --reload --port 8001")
    except Exception as e:
        print(f"✗ ERROR: {type(e).__name__}: {e}")
