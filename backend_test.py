#!/usr/bin/env python3
"""
Backend API Testing Script for Admin Panel Functionality
Tests user activation/deactivation and subscription plan management
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://examforge-14.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        self.test_plan_ids = []
        self.results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            return None, str(e)
    
    def test_admin_login(self):
        """Test admin login"""
        print("\n=== Testing Admin Authentication ===")
        
        # Test admin login
        login_data = {
            "email": "admin@sostools.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        
        if response is None:
            self.log_result("Admin Login", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if 'token' in data and data.get('user', {}).get('role') == 'admin':
                self.admin_token = data['token']
                self.log_result("Admin Login", True, "Admin login successful")
                return True
            else:
                self.log_result("Admin Login", False, "Invalid response format", data)
                return False
        else:
            self.log_result("Admin Login", False, f"Login failed with status {response.status_code}", response.text)
            return False
    
    def test_regular_user_login(self):
        """Test regular user login and get user ID"""
        print("\n=== Testing Regular User Authentication ===")
        
        # First try to create a test user
        user_data = {
            "email": "testuser@example.com",
            "password": "testpass123",
            "name": "Test User"
        }
        
        response = self.make_request('POST', '/auth/signup', user_data)
        
        if response and response.status_code == 200:
            data = response.json()
            self.user_token = data.get('token')
            self.test_user_id = data.get('user', {}).get('id')
            self.log_result("Regular User Signup", True, "Test user created successfully")
        else:
            # User might already exist, try login
            login_data = {
                "email": "testuser@example.com",
                "password": "testpass123"
            }
            
            response = self.make_request('POST', '/auth/login', login_data)
            
            if response and response.status_code == 200:
                data = response.json()
                self.user_token = data.get('token')
                self.test_user_id = data.get('user', {}).get('id')
                self.log_result("Regular User Login", True, "Test user login successful")
            else:
                self.log_result("Regular User Login", False, "Failed to login test user", response.text if response else "No response")
                return False
        
        return True
    
    def test_admin_endpoints_auth(self):
        """Test that admin endpoints require admin authentication"""
        print("\n=== Testing Admin Endpoint Authentication ===")
        
        if not self.admin_token:
            self.log_result("Admin Auth Check", False, "No admin token available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test admin users endpoint
        response = self.make_request('GET', '/admin/users', headers=headers)
        if response and response.status_code == 200:
            self.log_result("Admin Users Endpoint", True, "Admin can access users endpoint")
        else:
            self.log_result("Admin Users Endpoint", False, f"Admin cannot access users endpoint: {response.status_code if response else 'No response'}")
        
        # Test admin stats endpoint
        response = self.make_request('GET', '/admin/stats', headers=headers)
        if response and response.status_code == 200:
            self.log_result("Admin Stats Endpoint", True, "Admin can access stats endpoint")
        else:
            self.log_result("Admin Stats Endpoint", False, f"Admin cannot access stats endpoint: {response.status_code if response else 'No response'}")
        
        # Test with regular user token (should fail)
        if self.user_token:
            user_headers = {"Authorization": f"Bearer {self.user_token}"}
            response = self.make_request('GET', '/admin/users', headers=user_headers)
            if response and response.status_code == 403:
                self.log_result("Regular User Admin Access", True, "Regular user correctly denied admin access")
            else:
                self.log_result("Regular User Admin Access", False, f"Regular user should be denied admin access but got: {response.status_code if response else 'No response'}")
    
    def test_user_status_management(self):
        """Test user activation/deactivation"""
        print("\n=== Testing User Status Management ===")
        
        if not self.admin_token or not self.test_user_id:
            self.log_result("User Status Management", False, "Missing admin token or test user ID")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test deactivating user
        response = self.make_request('PUT', f'/admin/users/{self.test_user_id}/status', 
                                   headers=headers, params={"is_active": "false"})
        
        if response and response.status_code == 200:
            self.log_result("User Deactivation", True, "User deactivated successfully")
            
            # Test that deactivated user cannot login
            login_data = {
                "email": "testuser@example.com",
                "password": "testpass123"
            }
            
            response = self.make_request('POST', '/auth/login', login_data)
            if response and response.status_code == 403:
                self.log_result("Deactivated User Login Block", True, "Deactivated user correctly blocked from login")
            else:
                self.log_result("Deactivated User Login Block", False, f"Deactivated user should be blocked but got: {response.status_code if response else 'No response'}")
            
            # Reactivate user
            response = self.make_request('PUT', f'/admin/users/{self.test_user_id}/status', 
                                       headers=headers, params={"is_active": "true"})
            
            if response and response.status_code == 200:
                self.log_result("User Reactivation", True, "User reactivated successfully")
                
                # Test that reactivated user can login
                response = self.make_request('POST', '/auth/login', login_data)
                if response and response.status_code == 200:
                    self.log_result("Reactivated User Login", True, "Reactivated user can login successfully")
                else:
                    self.log_result("Reactivated User Login", False, f"Reactivated user should be able to login but got: {response.status_code if response else 'No response'}")
            else:
                self.log_result("User Reactivation", False, f"Failed to reactivate user: {response.status_code if response else 'No response'}")
        else:
            self.log_result("User Deactivation", False, f"Failed to deactivate user: {response.status_code if response else 'No response'}")
    
    def test_plan_creation(self):
        """Test subscription plan creation"""
        print("\n=== Testing Plan Creation ===")
        
        if not self.admin_token:
            self.log_result("Plan Creation", False, "No admin token available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test creating Monthly Plan
        monthly_plan = {
            "name": "Monthly Plan",
            "price": 999,
            "currency": "INR",
            "papers_limit": -1,
            "duration_days": 30,
            "features": ["Unlimited questions", "All exam types", "Priority support"]
        }
        
        response = self.make_request('POST', '/admin/plans', monthly_plan, headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            plan_id = data.get('plan', {}).get('id')
            if plan_id:
                self.test_plan_ids.append(plan_id)
                self.log_result("Monthly Plan Creation", True, f"Monthly plan created with ID: {plan_id}")
            else:
                self.log_result("Monthly Plan Creation", False, "Plan created but no ID returned", data)
        else:
            self.log_result("Monthly Plan Creation", False, f"Failed to create monthly plan: {response.status_code if response else 'No response'}")
        
        # Test creating Annual Plan
        annual_plan = {
            "name": "Annual Plan",
            "price": 9999,
            "currency": "INR",
            "papers_limit": -1,
            "duration_days": 365,
            "features": ["Unlimited questions", "All exam types", "Priority support", "Exclusive content"]
        }
        
        response = self.make_request('POST', '/admin/plans', annual_plan, headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            plan_id = data.get('plan', {}).get('id')
            if plan_id:
                self.test_plan_ids.append(plan_id)
                self.log_result("Annual Plan Creation", True, f"Annual plan created with ID: {plan_id}")
            else:
                self.log_result("Annual Plan Creation", False, "Plan created but no ID returned", data)
        else:
            self.log_result("Annual Plan Creation", False, f"Failed to create annual plan: {response.status_code if response else 'No response'}")
    
    def test_plan_retrieval(self):
        """Test fetching all plans"""
        print("\n=== Testing Plan Retrieval ===")
        
        if not self.admin_token:
            self.log_result("Plan Retrieval", False, "No admin token available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = self.make_request('GET', '/admin/plans', headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            plans = data.get('plans', [])
            
            # Check if our created plans are in the list
            created_plan_names = []
            for plan in plans:
                if plan.get('name') in ['Monthly Plan', 'Annual Plan']:
                    created_plan_names.append(plan.get('name'))
                    # Verify currency is INR
                    if plan.get('currency') == 'INR':
                        self.log_result(f"{plan.get('name')} Currency Check", True, f"Plan has correct currency: INR")
                    else:
                        self.log_result(f"{plan.get('name')} Currency Check", False, f"Plan has incorrect currency: {plan.get('currency')}")
            
            if len(created_plan_names) >= 2:
                self.log_result("Plan Retrieval", True, f"Successfully retrieved plans including: {', '.join(created_plan_names)}")
            else:
                self.log_result("Plan Retrieval", False, f"Expected to find Monthly and Annual plans, found: {created_plan_names}")
        else:
            self.log_result("Plan Retrieval", False, f"Failed to retrieve plans: {response.status_code if response else 'No response'}")
    
    def test_plan_status_management(self):
        """Test plan activation/deactivation"""
        print("\n=== Testing Plan Status Management ===")
        
        if not self.admin_token or not self.test_plan_ids:
            self.log_result("Plan Status Management", False, "No admin token or test plan IDs available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test deactivating first plan
        if self.test_plan_ids:
            plan_id = self.test_plan_ids[0]
            
            response = self.make_request('PUT', f'/admin/plans/{plan_id}/status', 
                                       headers=headers, params={"is_active": "false"})
            
            if response and response.status_code == 200:
                self.log_result("Plan Deactivation", True, f"Plan {plan_id} deactivated successfully")
                
                # Test reactivating the plan
                response = self.make_request('PUT', f'/admin/plans/{plan_id}/status', 
                                           headers=headers, params={"is_active": "true"})
                
                if response and response.status_code == 200:
                    self.log_result("Plan Reactivation", True, f"Plan {plan_id} reactivated successfully")
                else:
                    self.log_result("Plan Reactivation", False, f"Failed to reactivate plan: {response.status_code if response else 'No response'}")
            else:
                self.log_result("Plan Deactivation", False, f"Failed to deactivate plan: {response.status_code if response else 'No response'}")
    
    def test_plan_update(self):
        """Test plan update functionality"""
        print("\n=== Testing Plan Update ===")
        
        if not self.admin_token or not self.test_plan_ids:
            self.log_result("Plan Update", False, "No admin token or test plan IDs available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        if self.test_plan_ids:
            plan_id = self.test_plan_ids[0]
            
            updated_plan = {
                "name": "Updated Monthly Plan",
                "price": 1199,
                "currency": "INR",
                "papers_limit": 100,
                "duration_days": 30,
                "features": ["100 questions per month", "All exam types", "Priority support", "Updated feature"]
            }
            
            response = self.make_request('PUT', f'/admin/plans/{plan_id}', updated_plan, headers=headers)
            
            if response and response.status_code == 200:
                self.log_result("Plan Update", True, f"Plan {plan_id} updated successfully")
            else:
                self.log_result("Plan Update", False, f"Failed to update plan: {response.status_code if response else 'No response'}")
    
    def test_public_plans_endpoint(self):
        """Test public plans endpoint (no auth required)"""
        print("\n=== Testing Public Plans Endpoint ===")
        
        response = self.make_request('GET', '/subscriptions/plans')
        
        if response and response.status_code == 200:
            data = response.json()
            plans = data.get('plans', [])
            
            if plans:
                self.log_result("Public Plans Endpoint", True, f"Public plans endpoint returned {len(plans)} plans")
                
                # Check if any plan has INR currency
                inr_plans = [p for p in plans if p.get('currency') == 'INR']
                if inr_plans:
                    self.log_result("INR Currency Plans", True, f"Found {len(inr_plans)} plans with INR currency")
                else:
                    self.log_result("INR Currency Plans", False, "No plans found with INR currency")
            else:
                self.log_result("Public Plans Endpoint", False, "No plans returned from public endpoint")
        else:
            self.log_result("Public Plans Endpoint", False, f"Failed to access public plans: {response.status_code if response else 'No response'}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Admin Panel Functionality")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - skipping admin tests")
            return
        
        if not self.test_regular_user_login():
            print("❌ Regular user setup failed - skipping user tests")
        
        # Admin functionality tests
        self.test_admin_endpoints_auth()
        self.test_user_status_management()
        self.test_plan_creation()
        self.test_plan_retrieval()
        self.test_plan_status_management()
        self.test_plan_update()
        self.test_public_plans_endpoint()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if r['success'])
        failed = sum(1 for r in self.results if not r['success'])
        
        print(f"Total Tests: {len(self.results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)