#!/usr/bin/env python3
"""
Debug test for plan creation issue
"""

import requests
import json

BACKEND_URL = "https://examforge-14.preview.emergentagent.com/api"

def test_plan_creation():
    # Login as admin
    login_data = {
        "email": "admin@sostools.com",
        "password": "admin123"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"Admin login failed: {response.status_code}")
        return
    
    token = response.json()['token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to create a plan
    plan_data = {
        "name": "Test Plan",
        "price": 999,
        "currency": "INR",
        "papers_limit": -1,
        "duration_days": 30,
        "features": ["Test feature"]
    }
    
    print("Creating plan...")
    response = requests.post(f"{BACKEND_URL}/admin/plans", json=plan_data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    # Check existing plans
    print("\nGetting existing plans...")
    response = requests.get(f"{BACKEND_URL}/admin/plans", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        plans = response.json().get('plans', [])
        print(f"Found {len(plans)} plans:")
        for plan in plans:
            print(f"  - {plan.get('name')}: {plan.get('price')} {plan.get('currency')}")

if __name__ == "__main__":
    test_plan_creation()