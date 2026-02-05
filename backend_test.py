#!/usr/bin/env python3
"""
Comprehensive Backend Authentication & Authorization Test Suite
Tests JWT authentication, role-based access control, and API endpoints
"""

import requests
import json
import sys
import os
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://smart-chatbot-91.preview.emergentagent.com/api"

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@kbaseai.com",
    "password": "admin123"
}

CUSTOMER_CREDENTIALS = {
    "email": "customer@logistics.com", 
    "password": "customer123"
}

class AuthTestSuite:
    def __init__(self):
        self.admin_token = None
        self.customer_token = None
        self.admin_user = None
        self.customer_user = None
        self.customer_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def make_request(self, method: str, endpoint: str, token: Optional[str] = None, 
                    data: Optional[Dict] = None, expected_status: int = 200) -> Dict[str, Any]:
        """Make HTTP request with optional authentication"""
        url = f"{BACKEND_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": response.status_code == expected_status
            }
        except requests.exceptions.RequestException as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "success": False
            }
        except json.JSONDecodeError:
            return {
                "status_code": response.status_code,
                "data": {"error": "Invalid JSON response"},
                "success": False
            }

    def test_api_health(self):
        """Test if API is accessible"""
        print("\n=== API Health Check ===")
        
        result = self.make_request("GET", "/")
        if result["success"] and "KbaseAI Chatbot API" in str(result["data"]):
            self.log_test("API Health", True, "API is accessible and responding")
        else:
            self.log_test("API Health", False, "API is not accessible", result)

    def test_user_registration(self):
        """Test user registration functionality"""
        print("\n=== User Registration Tests ===")
        
        # Test customer registration
        new_customer_data = {
            "email": "newcustomer@test.com",
            "password": "testpass123",
            "name": "Test Customer",
            "role": "customer",
            "customer_name": "Test Company"
        }
        
        result = self.make_request("POST", "/auth/register", data=new_customer_data, expected_status=201)
        if result["success"]:
            self.log_test("Customer Registration", True, "Customer registered successfully")
            # Verify token is returned
            if "token" in result["data"]:
                self.log_test("Registration Token", True, "JWT token returned on registration")
            else:
                self.log_test("Registration Token", False, "No JWT token in registration response")
        else:
            self.log_test("Customer Registration", False, "Customer registration failed", result)
        
        # Test admin registration (should work if allowed)
        admin_data = {
            "email": "newadmin@test.com",
            "password": "adminpass123",
            "name": "Test Admin",
            "role": "admin"
        }
        
        result = self.make_request("POST", "/auth/register", data=admin_data, expected_status=201)
        if result["success"]:
            self.log_test("Admin Registration", True, "Admin registered successfully")
        else:
            self.log_test("Admin Registration", False, "Admin registration failed", result)
        
        # Test duplicate email registration
        result = self.make_request("POST", "/auth/register", data=new_customer_data, expected_status=400)
        if result["success"]:
            self.log_test("Duplicate Email Prevention", True, "Duplicate email registration properly rejected")
        else:
            self.log_test("Duplicate Email Prevention", False, "Duplicate email not handled correctly", result)

    def test_user_login(self):
        """Test user login functionality"""
        print("\n=== User Login Tests ===")
        
        # Test admin login
        result = self.make_request("POST", "/auth/login", data=ADMIN_CREDENTIALS)
        if result["success"]:
            self.admin_token = result["data"].get("token")
            self.admin_user = result["data"].get("user")
            self.log_test("Admin Login", True, "Admin login successful")
            
            # Verify token structure
            if self.admin_token and len(self.admin_token.split('.')) == 3:
                self.log_test("Admin JWT Structure", True, "JWT token has correct structure")
            else:
                self.log_test("Admin JWT Structure", False, "Invalid JWT token structure")
                
            # Verify user data
            if self.admin_user and self.admin_user.get("role") == "admin":
                self.log_test("Admin Role Verification", True, "Admin role correctly returned")
            else:
                self.log_test("Admin Role Verification", False, "Admin role not correct", self.admin_user)
        else:
            self.log_test("Admin Login", False, "Admin login failed", result)
        
        # Test customer login
        result = self.make_request("POST", "/auth/login", data=CUSTOMER_CREDENTIALS)
        if result["success"]:
            self.customer_token = result["data"].get("token")
            self.customer_user = result["data"].get("user")
            self.customer_id = self.customer_user.get("customer_id") if self.customer_user else None
            self.log_test("Customer Login", True, "Customer login successful")
            
            # Verify customer has customer_id
            if self.customer_id:
                self.log_test("Customer ID Assignment", True, "Customer has customer_id assigned")
            else:
                self.log_test("Customer ID Assignment", False, "Customer missing customer_id", self.customer_user)
        else:
            self.log_test("Customer Login", False, "Customer login failed", result)
        
        # Test invalid credentials
        invalid_creds = {"email": "invalid@test.com", "password": "wrongpass"}
        result = self.make_request("POST", "/auth/login", data=invalid_creds, expected_status=401)
        if result["success"]:
            self.log_test("Invalid Credentials Rejection", True, "Invalid credentials properly rejected")
        else:
            self.log_test("Invalid Credentials Rejection", False, "Invalid credentials not handled correctly", result)

    def test_token_authentication(self):
        """Test JWT token authentication on protected endpoints"""
        print("\n=== Token Authentication Tests ===")
        
        # Test /auth/me endpoint with valid token
        if self.admin_token:
            result = self.make_request("GET", "/auth/me", token=self.admin_token)
            if result["success"]:
                user_data = result["data"].get("user")
                if user_data and user_data.get("email") == ADMIN_CREDENTIALS["email"]:
                    self.log_test("Admin Token Validation", True, "Admin token validates correctly")
                else:
                    self.log_test("Admin Token Validation", False, "Admin token returns wrong user data", user_data)
            else:
                self.log_test("Admin Token Validation", False, "Admin token validation failed", result)
        
        if self.customer_token:
            result = self.make_request("GET", "/auth/me", token=self.customer_token)
            if result["success"]:
                user_data = result["data"].get("user")
                if user_data and user_data.get("email") == CUSTOMER_CREDENTIALS["email"]:
                    self.log_test("Customer Token Validation", True, "Customer token validates correctly")
                else:
                    self.log_test("Customer Token Validation", False, "Customer token returns wrong user data", user_data)
            else:
                self.log_test("Customer Token Validation", False, "Customer token validation failed", result)
        
        # Test endpoint without token
        result = self.make_request("GET", "/auth/me", expected_status=401)
        if result["success"]:
            self.log_test("No Token Rejection", True, "Request without token properly rejected")
        else:
            self.log_test("No Token Rejection", False, "Request without token not handled correctly", result)
        
        # Test endpoint with invalid token
        result = self.make_request("GET", "/auth/me", token="invalid.token.here", expected_status=401)
        if result["success"]:
            self.log_test("Invalid Token Rejection", True, "Invalid token properly rejected")
        else:
            self.log_test("Invalid Token Rejection", False, "Invalid token not handled correctly", result)

    def test_role_based_access_control(self):
        """Test role-based access control"""
        print("\n=== Role-Based Access Control Tests ===")
        
        # Test admin access to all customers
        if self.admin_token:
            result = self.make_request("GET", "/customers", token=self.admin_token)
            if result["success"]:
                customers = result["data"]
                if isinstance(customers, list):
                    self.log_test("Admin Customer Access", True, f"Admin can see {len(customers)} customers")
                else:
                    self.log_test("Admin Customer Access", False, "Admin customer response not a list", customers)
            else:
                self.log_test("Admin Customer Access", False, "Admin cannot access customers", result)
        
        # Test customer access to their own data only
        if self.customer_token:
            result = self.make_request("GET", "/customers", token=self.customer_token)
            if result["success"]:
                customers = result["data"]
                if isinstance(customers, list):
                    if len(customers) <= 1:  # Should only see their own customer
                        self.log_test("Customer Limited Access", True, f"Customer sees only {len(customers)} customer(s)")
                    else:
                        self.log_test("Customer Limited Access", False, f"Customer sees too many customers: {len(customers)}")
                else:
                    self.log_test("Customer Limited Access", False, "Customer response not a list", customers)
            else:
                self.log_test("Customer Limited Access", False, "Customer cannot access customers", result)
        
        # Test customer access to specific customer endpoint
        if self.customer_token and self.customer_id:
            # Access own customer data
            result = self.make_request("GET", f"/customers/{self.customer_id}", token=self.customer_token)
            if result["success"]:
                self.log_test("Customer Own Data Access", True, "Customer can access own data")
            else:
                self.log_test("Customer Own Data Access", False, "Customer cannot access own data", result)
            
            # Try to access another customer's data (should fail)
            fake_customer_id = "fake-customer-id-12345"
            result = self.make_request("GET", f"/customers/{fake_customer_id}", token=self.customer_token, expected_status=403)
            if result["success"]:
                self.log_test("Customer Unauthorized Access Block", True, "Customer blocked from accessing other customer data")
            else:
                self.log_test("Customer Unauthorized Access Block", False, "Customer not properly blocked from other data", result)

    def test_customer_creation_permissions(self):
        """Test customer creation permissions (admin only)"""
        print("\n=== Customer Creation Permission Tests ===")
        
        new_customer_data = {
            "name": "Test Customer via API",
            "webhook_url": "https://example.com/webhook"
        }
        
        # Test admin can create customers
        if self.admin_token:
            result = self.make_request("POST", "/customers", token=self.admin_token, data=new_customer_data, expected_status=200)
            if result["success"]:
                self.log_test("Admin Customer Creation", True, "Admin can create customers")
            else:
                self.log_test("Admin Customer Creation", False, "Admin cannot create customers", result)
        
        # Test customer cannot create customers
        if self.customer_token:
            result = self.make_request("POST", "/customers", token=self.customer_token, data=new_customer_data, expected_status=403)
            if result["success"]:
                self.log_test("Customer Creation Block", True, "Customer properly blocked from creating customers")
            else:
                self.log_test("Customer Creation Block", False, "Customer not properly blocked from creating customers", result)

    def test_stats_api_with_auth(self):
        """Test stats API with authentication"""
        print("\n=== Stats API Authentication Tests ===")
        
        if self.customer_id:
            # Test admin access to customer stats
            if self.admin_token:
                result = self.make_request("GET", f"/stats/{self.customer_id}", token=self.admin_token)
                if result["success"]:
                    stats = result["data"]
                    expected_keys = ["knowledge_files", "scraped_pages", "conversations"]
                    if all(key in stats for key in expected_keys):
                        self.log_test("Admin Stats Access", True, "Admin can access customer stats")
                    else:
                        self.log_test("Admin Stats Access", False, "Stats response missing expected keys", stats)
                else:
                    self.log_test("Admin Stats Access", False, "Admin cannot access stats", result)
            
            # Test customer access to own stats
            if self.customer_token:
                result = self.make_request("GET", f"/stats/{self.customer_id}", token=self.customer_token)
                if result["success"]:
                    self.log_test("Customer Own Stats Access", True, "Customer can access own stats")
                else:
                    self.log_test("Customer Own Stats Access", False, "Customer cannot access own stats", result)
        
        # Test unauthorized stats access
        if self.customer_token:
            fake_customer_id = "fake-customer-id-12345"
            result = self.make_request("GET", f"/stats/{fake_customer_id}", token=self.customer_token, expected_status=403)
            if result["success"]:
                self.log_test("Stats Unauthorized Access Block", True, "Customer blocked from accessing other customer stats")
            else:
                self.log_test("Stats Unauthorized Access Block", False, "Customer not properly blocked from other stats", result)

    def test_password_change(self):
        """Test password change functionality"""
        print("\n=== Password Change Tests ===")
        
        if self.customer_token:
            # Test valid password change
            change_data = {
                "current_password": CUSTOMER_CREDENTIALS["password"],
                "new_password": "newpassword123"
            }
            
            result = self.make_request("POST", "/auth/change-password", token=self.customer_token, data=change_data)
            if result["success"]:
                self.log_test("Password Change", True, "Password changed successfully")
                
                # Test login with new password
                new_creds = {
                    "email": CUSTOMER_CREDENTIALS["email"],
                    "password": "newpassword123"
                }
                login_result = self.make_request("POST", "/auth/login", data=new_creds)
                if login_result["success"]:
                    self.log_test("New Password Login", True, "Can login with new password")
                    
                    # Change password back
                    revert_data = {
                        "current_password": "newpassword123",
                        "new_password": CUSTOMER_CREDENTIALS["password"]
                    }
                    new_token = login_result["data"].get("token")
                    self.make_request("POST", "/auth/change-password", token=new_token, data=revert_data)
                else:
                    self.log_test("New Password Login", False, "Cannot login with new password", login_result)
            else:
                self.log_test("Password Change", False, "Password change failed", result)
            
            # Test invalid current password
            invalid_change_data = {
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            }
            
            result = self.make_request("POST", "/auth/change-password", token=self.customer_token, data=invalid_change_data, expected_status=401)
            if result["success"]:
                self.log_test("Invalid Current Password Block", True, "Invalid current password properly rejected")
            else:
                self.log_test("Invalid Current Password Block", False, "Invalid current password not handled correctly", result)

    def run_all_tests(self):
        """Run all authentication and authorization tests"""
        print("🚀 Starting Comprehensive Backend Authentication & Authorization Tests")
        print(f"🎯 Testing against: {BACKEND_URL}")
        
        # Run all test suites
        self.test_api_health()
        self.test_user_registration()
        self.test_user_login()
        self.test_token_authentication()
        self.test_role_based_access_control()
        self.test_customer_creation_permissions()
        self.test_stats_api_with_auth()
        self.test_password_change()
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        print("\n" + "="*60)
        return failed_tests == 0

if __name__ == "__main__":
    test_suite = AuthTestSuite()
    success = test_suite.run_all_tests()
    sys.exit(0 if success else 1)