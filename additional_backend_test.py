#!/usr/bin/env python3
"""
Additional Backend API Tests for Knowledge Base and Chat endpoints
"""

import requests
import json
import io
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

class AdditionalAPITestSuite:
    def __init__(self):
        self.admin_token = None
        self.customer_token = None
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
                    data: Optional[Dict] = None, files: Optional[Dict] = None, 
                    expected_status: int = 200) -> Dict[str, Any]:
        """Make HTTP request with optional authentication"""
        url = f"{BACKEND_URL}{endpoint}"
        headers = {}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        if not files:
            headers["Content-Type"] = "application/json"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                if files:
                    response = requests.post(url, headers=headers, data=data, files=files, timeout=10)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=10)
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

    def setup_tokens(self):
        """Get authentication tokens"""
        print("🔑 Setting up authentication tokens...")
        
        # Get admin token
        result = self.make_request("POST", "/auth/login", data=ADMIN_CREDENTIALS)
        if result["success"]:
            self.admin_token = result["data"].get("token")
            print("✅ Admin token obtained")
        else:
            print("❌ Failed to get admin token")
            return False
        
        # Get customer token
        result = self.make_request("POST", "/auth/login", data=CUSTOMER_CREDENTIALS)
        if result["success"]:
            self.customer_token = result["data"].get("token")
            self.customer_id = result["data"].get("user", {}).get("customer_id")
            print("✅ Customer token obtained")
        else:
            print("❌ Failed to get customer token")
            return False
            
        return True

    def test_knowledge_base_endpoints(self):
        """Test knowledge base file upload and management"""
        print("\n=== Knowledge Base API Tests ===")
        
        if not self.customer_token or not self.customer_id:
            self.log_test("Knowledge Base Setup", False, "Missing customer token or ID")
            return
        
        # Test file upload with authentication
        test_file_content = "This is a test knowledge base document with important information about our company."
        files = {
            'file': ('test_document.txt', io.BytesIO(test_file_content.encode()), 'text/plain')
        }
        data = {
            'customer_id': self.customer_id
        }
        
        result = self.make_request("POST", "/knowledge/upload", token=self.customer_token, 
                                 data=data, files=files)
        if result["success"]:
            self.log_test("Knowledge File Upload", True, "File uploaded successfully with authentication")
            file_id = result["data"].get("file_id")
        else:
            self.log_test("Knowledge File Upload", False, "File upload failed", result)
            file_id = None
        
        # Test file upload without authentication
        result = self.make_request("POST", "/knowledge/upload", data=data, files=files, expected_status=401)
        if result["success"]:
            self.log_test("Knowledge Upload Auth Required", True, "File upload properly requires authentication")
        else:
            self.log_test("Knowledge Upload Auth Required", False, "File upload doesn't require auth", result)
        
        # Test getting knowledge files
        result = self.make_request("GET", f"/knowledge/{self.customer_id}", token=self.customer_token)
        if result["success"]:
            files_list = result["data"]
            if isinstance(files_list, list):
                self.log_test("Knowledge Files Retrieval", True, f"Retrieved {len(files_list)} knowledge files")
            else:
                self.log_test("Knowledge Files Retrieval", False, "Response not a list", files_list)
        else:
            self.log_test("Knowledge Files Retrieval", False, "Failed to retrieve knowledge files", result)
        
        # Test unauthorized access to knowledge files
        fake_customer_id = "fake-customer-id-12345"
        result = self.make_request("GET", f"/knowledge/{fake_customer_id}", token=self.customer_token, expected_status=403)
        if result["success"]:
            self.log_test("Knowledge Files Access Control", True, "Customer blocked from accessing other customer files")
        else:
            self.log_test("Knowledge Files Access Control", False, "Customer not properly blocked", result)
        
        # Test admin access to knowledge files
        if self.admin_token:
            result = self.make_request("GET", f"/knowledge/{self.customer_id}", token=self.admin_token)
            if result["success"]:
                self.log_test("Admin Knowledge Access", True, "Admin can access customer knowledge files")
            else:
                self.log_test("Admin Knowledge Access", False, "Admin cannot access knowledge files", result)
        
        # Test file deletion if we have a file_id
        if file_id:
            result = self.make_request("DELETE", f"/knowledge/{file_id}", token=self.customer_token)
            if result["success"]:
                self.log_test("Knowledge File Deletion", True, "File deleted successfully")
            else:
                self.log_test("Knowledge File Deletion", False, "File deletion failed", result)

    def test_chat_endpoints(self):
        """Test chat endpoints (note: these don't require authentication)"""
        print("\n=== Chat API Tests ===")
        
        if not self.customer_id:
            self.log_test("Chat Setup", False, "Missing customer ID")
            return
        
        # Test regular chat endpoint
        chat_data = {
            "customer_id": self.customer_id,
            "message": "Hello, can you help me with information about the company?",
            "session_id": "test-session-123"
        }
        
        result = self.make_request("POST", "/chat", data=chat_data)
        if result["success"]:
            response_data = result["data"]
            if "response" in response_data and "session_id" in response_data:
                self.log_test("Chat Endpoint", True, "Chat endpoint working correctly")
            else:
                self.log_test("Chat Endpoint", False, "Chat response missing required fields", response_data)
        else:
            self.log_test("Chat Endpoint", False, "Chat endpoint failed", result)
        
        # Test webhook chat endpoint
        webhook_data = {
            "customer_id": self.customer_id,
            "message": "What services do you offer?",
            "user_id": "webhook-user-123"
        }
        
        result = self.make_request("POST", "/webhook/chat", data=webhook_data)
        if result["success"]:
            response_data = result["data"]
            if "response" in response_data and "session_id" in response_data:
                self.log_test("Webhook Chat Endpoint", True, "Webhook chat endpoint working correctly")
            else:
                self.log_test("Webhook Chat Endpoint", False, "Webhook response missing required fields", response_data)
        else:
            self.log_test("Webhook Chat Endpoint", False, "Webhook chat endpoint failed", result)
        
        # Test chat with missing required fields
        invalid_chat_data = {
            "message": "Hello"
            # Missing customer_id
        }
        
        result = self.make_request("POST", "/chat", data=invalid_chat_data, expected_status=400)
        if result["success"]:
            self.log_test("Chat Validation", True, "Chat properly validates required fields")
        else:
            self.log_test("Chat Validation", False, "Chat validation not working", result)

    def test_additional_auth_scenarios(self):
        """Test additional authentication scenarios"""
        print("\n=== Additional Authentication Scenarios ===")
        
        # Test expired/malformed token
        malformed_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"
        result = self.make_request("GET", "/auth/me", token=malformed_token, expected_status=401)
        if result["success"]:
            self.log_test("Malformed Token Rejection", True, "Malformed token properly rejected")
        else:
            self.log_test("Malformed Token Rejection", False, "Malformed token not handled", result)
        
        # Test customer trying to create another customer
        if self.customer_token:
            new_customer_data = {
                "name": "Unauthorized Customer Creation",
                "webhook_url": "https://example.com/webhook"
            }
            result = self.make_request("POST", "/customers", token=self.customer_token, 
                                     data=new_customer_data, expected_status=403)
            if result["success"]:
                self.log_test("Customer Creation Prevention", True, "Customer blocked from creating customers")
            else:
                self.log_test("Customer Creation Prevention", False, "Customer not blocked from creating customers", result)

    def run_all_tests(self):
        """Run all additional API tests"""
        print("🚀 Starting Additional Backend API Tests")
        print(f"🎯 Testing against: {BACKEND_URL}")
        
        if not self.setup_tokens():
            print("❌ Failed to setup authentication tokens")
            return False
        
        # Run all test suites
        self.test_knowledge_base_endpoints()
        self.test_chat_endpoints()
        self.test_additional_auth_scenarios()
        
        # Summary
        print("\n" + "="*60)
        print("📊 ADDITIONAL TESTS SUMMARY")
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
    test_suite = AdditionalAPITestSuite()
    success = test_suite.run_all_tests()
    exit(0 if success else 1)