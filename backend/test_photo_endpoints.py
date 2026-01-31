#!/usr/bin/env python
"""Test photo upload/download/delete endpoints."""
import requests
import sys

BASE = 'http://localhost:8001'

print("=" * 60)
print("PHOTO ENDPOINTS TEST")
print("=" * 60)

# Step 1: Check health
print("\n1. Check backend health")
try:
    r = requests.get(f'{BASE}/api/health', timeout=3)
    assert r.status_code == 200, f"Health check failed: {r.status_code}"
    print(f"   ✓ Backend healthy: {r.json()}")
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    print("\n** Backend is not responding. Please restart it. **")
    sys.exit(1)

# Step 2: Login
print("\n2. Login and get token")
try:
    r = requests.post(f'{BASE}/api/auth/login',
                     json={'username': 'seb', 'password': 'seb12170'})
    assert r.status_code == 200, f"Login failed: {r.status_code}"
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    print(f"   ✓ Login successful, token: {token[:20]}...")
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    sys.exit(1)

# Step 3: Get first STAFF profile
print("\n3. Get first STAFF profile ID")
try:
    r = requests.get(f'{BASE}/api/profiles', headers=headers,
                    params={'page_size': 1, 'profile_type': 'STAFF'})
    assert r.status_code == 200, f"Get profiles failed: {r.status_code}"
    data = r.json()
    profile_id = data['items'][0]['id']
    staff_id = data['items'][0]['staff_id']
    print(f"   ✓ Using profile: {staff_id}")
    print(f"     Profile ID: {profile_id}")
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    sys.exit(1)

# Step 4: Upload photo
print("\n4. TEST UPLOAD: Upload test_photo.png")
try:
    with open('test_photo.png', 'rb') as f:
        r = requests.put(f'{BASE}/api/profiles/{profile_id}/photo',
                        headers=headers,
                        files={'file': ('photo.png', f, 'image/png')})

    if r.status_code == 200:
        data = r.json()
        print(f"   ✓ Upload successful")
        print(f"     Message: {data['message']}")
        print(f"     Size: {data['size']} bytes")
        print(f"     Type: {data['type']}")
    else:
        print(f"   ✗ FAILED: Status {r.status_code}")
        print(f"     Error: {r.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    sys.exit(1)

# Step 5: Download photo
print("\n5. TEST DOWNLOAD: Verify photo downloads correctly")
try:
    r = requests.get(f'{BASE}/api/profiles/{profile_id}/photo')

    if r.status_code == 200:
        print(f"   ✓ Download successful")
        print(f"     Content-Type: {r.headers.get('content-type')}")
        print(f"     Size: {len(r.content)} bytes")
        print(f"     Is valid PNG: {r.content[:4] == b'\\x89PNG'}")

        # Save downloaded photo
        with open('downloaded_photo.png', 'wb') as f:
            f.write(r.content)
        print(f"     Saved to: downloaded_photo.png")
    else:
        print(f"   ✗ FAILED: Status {r.status_code}")
        print(f"     Error: {r.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    sys.exit(1)

# Step 5b: Verify has_picture flag
print("\n5b. Verify has_picture=true in profile")
try:
    r = requests.get(f'{BASE}/api/profiles/{profile_id}', headers=headers)
    data = r.json()
    has_picture = data['has_picture']

    if has_picture:
        print(f"   ✓ has_picture flag is True")
    else:
        print(f"   ✗ FAILED: has_picture is {has_picture}, expected True")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    sys.exit(1)

# Step 6: Delete photo
print("\n6. TEST DELETE: Remove the photo")
try:
    r = requests.delete(f'{BASE}/api/profiles/{profile_id}/photo', headers=headers)

    if r.status_code == 204:
        print(f"   ✓ Delete successful (Status 204)")
    else:
        print(f"   ✗ FAILED: Status {r.status_code}")
        print(f"     Error: {r.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    sys.exit(1)

# Step 7: Verify deletion
print("\n7. Verify deletion worked")
try:
    r = requests.get(f'{BASE}/api/profiles/{profile_id}/photo')

    if r.status_code == 404:
        print(f"   ✓ Photo deleted (Status 404 as expected)")
    else:
        print(f"   ✗ FAILED: Status {r.status_code}, expected 404")
        print(f"     Response: {r.text}")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    sys.exit(1)

# Step 7b: Verify has_picture flag
print("\n7b. Verify has_picture=false in profile")
try:
    r = requests.get(f'{BASE}/api/profiles/{profile_id}', headers=headers)
    data = r.json()
    has_picture = data['has_picture']

    if not has_picture:
        print(f"   ✓ has_picture flag is False")
    else:
        print(f"   ✗ FAILED: has_picture is {has_picture}, expected False")
        sys.exit(1)
except Exception as e:
    print(f"   ✗ FAILED: {e}")
    sys.exit(1)

print("\n" + "=" * 60)
print("ALL PHOTO ENDPOINT TESTS PASSED ✓")
print("=" * 60)
print(f"\nBrowser URL to test photo download:")
print(f"  http://localhost:8001/api/profiles/{profile_id}/photo")
print(f"  (After re-uploading a photo)")
