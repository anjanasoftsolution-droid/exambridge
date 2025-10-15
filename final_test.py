#!/usr/bin/env python3
"""
Final comprehensive test for admin panel functionality
"""

import requests
import json
import time
import uuid

BACKEND_URL = "https://examforge-14.preview.emergentagent.com/api"

def test_admin_functionality():
    print("🚀 Final Admin Panel Functionality Test")
    print("=" * 60)
    
    # Login as admin
    admin_login = {
        "email": "admin@sostools.com",
        "password": "admin123"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login, timeout=10)
    if response.status_code != 200:
        print(f"❌ Admin login failed: {response.status_code}")
        return False
    
    admin_token = response.json()['token']
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ Admin login successful")
    
    # Create a unique test user
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": unique_email,
        "password": "testpass123",
        "name": "Test User"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/signup", json=user_data, timeout=10)
    if response.status_code != 200:
        print(f"❌ Failed to create test user: {response.status_code}")
        return False
    
    user_token = response.json()['token']
    user_id = response.json()['user']['id']
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print(f"✅ Test user created: {unique_email}")
    
    # Test 1: Regular user cannot access admin endpoints
    print("\n--- Test 1: Admin Access Control ---")
    response = requests.get(f"{BACKEND_URL}/admin/users", headers=user_headers, timeout=10)
    if response.status_code == 403:
        print("✅ Regular user correctly denied admin access")
    else:
        print(f"❌ Regular user should be denied admin access but got: {response.status_code}")
    
    # Test 2: Admin can access admin endpoints
    response = requests.get(f"{BACKEND_URL}/admin/users", headers=admin_headers, timeout=10)
    if response.status_code == 200:
        print("✅ Admin can access users endpoint")
    else:
        print(f"❌ Admin should access users endpoint but got: {response.status_code}")
    
    # Test 3: User deactivation
    print("\n--- Test 3: User Status Management ---")
    params = {"is_active": "false"}
    response = requests.put(f"{BACKEND_URL}/admin/users/{user_id}/status", 
                           headers=admin_headers, params=params, timeout=10)
    
    if response.status_code == 200:
        print("✅ User deactivated successfully")
        
        # Test deactivated user login
        login_data = {
            "email": unique_email,
            "password": "testpass123"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=10)
        if response.status_code == 403:
            print("✅ Deactivated user correctly blocked from login")
        else:
            print(f"❌ Deactivated user should be blocked but got: {response.status_code}")
        
        # Reactivate user
        params = {"is_active": "true"}
        response = requests.put(f"{BACKEND_URL}/admin/users/{user_id}/status", 
                               headers=admin_headers, params=params, timeout=10)
        
        if response.status_code == 200:
            print("✅ User reactivated successfully")
            
            # Test reactivated user login
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=10)
            if response.status_code == 200:
                print("✅ Reactivated user can login successfully")
            else:
                print(f"❌ Reactivated user should login but got: {response.status_code}")
        else:
            print(f"❌ Failed to reactivate user: {response.status_code}")
    else:
        print(f"❌ Failed to deactivate user: {response.status_code}")
    
    # Test 4: Plan creation with INR currency
    print("\n--- Test 4: Plan Management ---")
    plan_data = {
        "name": f"Test Plan {uuid.uuid4().hex[:6]}",
        "price": 999,
        "currency": "INR",
        "papers_limit": -1,
        "duration_days": 30,
        "features": ["Unlimited questions", "All exam types", "Priority support"]
    }
    
    response = requests.post(f"{BACKEND_URL}/admin/plans", json=plan_data, headers=admin_headers, timeout=10)
    if response.status_code == 200:
        plan_id = response.json()['plan']['id']
        print(f"✅ Plan created successfully with INR currency: {plan_id}")
        
        # Test plan deactivation
        params = {"is_active": "false"}
        response = requests.put(f"{BACKEND_URL}/admin/plans/{plan_id}/status", 
                               headers=admin_headers, params=params, timeout=10)
        
        if response.status_code == 200:
            print("✅ Plan deactivated successfully")
            
            # Test plan reactivation
            params = {"is_active": "true"}
            response = requests.put(f"{BACKEND_URL}/admin/plans/{plan_id}/status", 
                                   headers=admin_headers, params=params, timeout=10)
            
            if response.status_code == 200:
                print("✅ Plan reactivated successfully")
            else:
                print(f"❌ Failed to reactivate plan: {response.status_code}")
        else:
            print(f"❌ Failed to deactivate plan: {response.status_code}")
        
        # Test plan update
        updated_plan = {
            "name": f"Updated Test Plan {uuid.uuid4().hex[:6]}",
            "price": 1199,
            "currency": "INR",
            "papers_limit": 100,
            "duration_days": 30,
            "features": ["100 questions per month", "All exam types", "Priority support"]
        }
        
        response = requests.put(f"{BACKEND_URL}/admin/plans/{plan_id}", json=updated_plan, headers=admin_headers, timeout=10)
        if response.status_code == 200:
            print("✅ Plan updated successfully")
        else:
            print(f"❌ Failed to update plan: {response.status_code}")
    else:
        print(f"❌ Failed to create plan: {response.status_code}")
    
    # Test 5: Get all plans (admin)
    response = requests.get(f"{BACKEND_URL}/admin/plans", headers=admin_headers, timeout=10)
    if response.status_code == 200:
        plans = response.json().get('plans', [])
        inr_plans = [p for p in plans if p.get('currency') == 'INR']
        print(f"✅ Retrieved {len(plans)} plans, {len(inr_plans)} with INR currency")
    else:
        print(f"❌ Failed to retrieve admin plans: {response.status_code}")
    
    # Test 6: Public plans endpoint
    response = requests.get(f"{BACKEND_URL}/subscriptions/plans", timeout=10)
    if response.status_code == 200:
        plans = response.json().get('plans', [])
        print(f"✅ Public plans endpoint returned {len(plans)} plans")
    else:
        print(f"❌ Failed to access public plans: {response.status_code}")
    
    print("\n" + "=" * 60)
    print("🎉 Admin Panel Functionality Test Complete!")
    return True

if __name__ == "__main__":
    test_admin_functionality()