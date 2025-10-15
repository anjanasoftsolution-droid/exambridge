#!/usr/bin/env python3
"""
Specific test for deactivated user login and admin access
"""

import requests
import json
import time

BACKEND_URL = "https://examforge-14.preview.emergentagent.com/api"

def test_deactivated_user_login():
    print("=== Testing Deactivated User Login Block ===")
    
    # Login as admin
    admin_login = {
        "email": "admin@sostools.com",
        "password": "admin123"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login, timeout=10)
    if response.status_code != 200:
        print(f"Admin login failed: {response.status_code}")
        return
    
    admin_token = response.json()['token']
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create/login test user
    user_data = {
        "email": "testuser2@example.com",
        "password": "testpass123",
        "name": "Test User 2"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/signup", json=user_data, timeout=10)
    if response.status_code == 200:
        user_token = response.json()['token']
        user_id = response.json()['user']['id']
        print(f"✅ Test user created with ID: {user_id}")
    else:
        print(f"Signup failed with {response.status_code}: {response.text}")
        # Try login if user exists
        login_data = {
            "email": "testuser2@example.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=10)
        if response.status_code == 200:
            user_token = response.json()['token']
            user_id = response.json()['user']['id']
            print(f"✅ Test user logged in with ID: {user_id}")
        elif response.status_code == 403:
            print("User exists but is deactivated, let's reactivate first")
            # Get all users to find the user ID
            response = requests.get(f"{BACKEND_URL}/admin/users", headers=admin_headers, timeout=10)
            if response.status_code == 200:
                users = response.json().get('users', [])
                test_user = next((u for u in users if u['email'] == 'testuser2@example.com'), None)
                if test_user:
                    user_id = test_user['id']
                    print(f"Found existing user with ID: {user_id}")
                    # Reactivate first
                    params = {"is_active": "true"}
                    response = requests.put(f"{BACKEND_URL}/admin/users/{user_id}/status", 
                                           headers=admin_headers, params=params, timeout=10)
                    if response.status_code == 200:
                        print("User reactivated, trying login again")
                        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=10)
                        if response.status_code == 200:
                            user_token = response.json()['token']
                            print(f"✅ Test user logged in with ID: {user_id}")
                        else:
                            print(f"❌ Still failed to login: {response.status_code}")
                            return
                    else:
                        print(f"❌ Failed to reactivate user: {response.status_code}")
                        return
                else:
                    print("❌ User not found in admin list")
                    return
            else:
                print(f"❌ Failed to get users list: {response.status_code}")
                return
        else:
            print(f"❌ Failed to create/login test user: {response.status_code} - {response.text}")
            return
    
    # Test regular user accessing admin endpoint (should fail)
    user_headers = {"Authorization": f"Bearer {user_token}"}
    response = requests.get(f"{BACKEND_URL}/admin/users", headers=user_headers, timeout=10)
    if response.status_code == 403:
        print("✅ Regular user correctly denied admin access")
    else:
        print(f"❌ Regular user should be denied admin access but got: {response.status_code}")
    
    # Deactivate user
    params = {"is_active": "false"}
    response = requests.put(f"{BACKEND_URL}/admin/users/{user_id}/status", 
                           headers=admin_headers, params=params, timeout=10)
    
    if response.status_code == 200:
        print("✅ User deactivated successfully")
        
        # Wait a moment for the change to propagate
        time.sleep(1)
        
        # Try to login as deactivated user
        login_data = {
            "email": "testuser2@example.com",
            "password": "testpass123"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=10)
        if response.status_code == 403:
            print("✅ Deactivated user correctly blocked from login")
            print(f"   Response: {response.json().get('detail', 'No detail')}")
        else:
            print(f"❌ Deactivated user should be blocked but got: {response.status_code}")
            if response.status_code == 200:
                print(f"   User was able to login: {response.json()}")
        
        # Reactivate user
        params = {"is_active": "true"}
        response = requests.put(f"{BACKEND_URL}/admin/users/{user_id}/status", 
                               headers=admin_headers, params=params, timeout=10)
        
        if response.status_code == 200:
            print("✅ User reactivated successfully")
            
            # Test login after reactivation
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=10)
            if response.status_code == 200:
                print("✅ Reactivated user can login successfully")
            else:
                print(f"❌ Reactivated user should be able to login but got: {response.status_code}")
        else:
            print(f"❌ Failed to reactivate user: {response.status_code}")
    else:
        print(f"❌ Failed to deactivate user: {response.status_code}")

if __name__ == "__main__":
    test_deactivated_user_login()