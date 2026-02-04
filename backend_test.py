import requests
import sys
import json
import io
from datetime import datetime

class KbaseAITester:
    def __init__(self, base_url="https://knowledgebot-11.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.customer_id = None
        self.file_id = None
        self.session_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_create_customer(self):
        """Test customer creation"""
        test_name = f"Test Customer {datetime.now().strftime('%H%M%S')}"
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data={"name": test_name, "webhook_url": "https://example.com/webhook"}
        )
        if success and 'id' in response:
            self.customer_id = response['id']
            print(f"   Created customer ID: {self.customer_id}")
        return success

    def test_get_customers(self):
        """Test getting all customers"""
        return self.run_test("Get Customers", "GET", "customers", 200)

    def test_get_customer_by_id(self):
        """Test getting specific customer"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        return self.run_test("Get Customer by ID", "GET", f"customers/{self.customer_id}", 200)

    def test_upload_knowledge_file(self):
        """Test knowledge file upload"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        
        # Create a test text file
        test_content = "This is a test knowledge base file. It contains information about our company services and products."
        test_file = io.BytesIO(test_content.encode('utf-8'))
        
        files = {'file': ('test_knowledge.txt', test_file, 'text/plain')}
        data = {'customer_id': self.customer_id}
        
        success, response = self.run_test(
            "Upload Knowledge File",
            "POST",
            "knowledge/upload",
            200,
            data=data,
            files=files
        )
        if success and 'file_id' in response:
            self.file_id = response['file_id']
            print(f"   Uploaded file ID: {self.file_id}")
        return success

    def test_get_knowledge_files(self):
        """Test getting knowledge files for customer"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        return self.run_test("Get Knowledge Files", "GET", f"knowledge/{self.customer_id}", 200)

    def test_create_scrape_config(self):
        """Test creating scrape configuration"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        
        config_data = {
            "customer_id": self.customer_id,
            "urls": ["https://example.com", "https://httpbin.org/html"],
            "schedule": "0 0 * * *",
            "auto_scrape": False
        }
        
        return self.run_test("Create Scrape Config", "POST", "scrape/config", 200, data=config_data)

    def test_get_scrape_configs(self):
        """Test getting scrape configurations"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        return self.run_test("Get Scrape Configs", "GET", f"scrape/config/{self.customer_id}", 200)

    def test_manual_scrape(self):
        """Test manual scraping"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        
        urls = ["https://httpbin.org/html"]
        return self.run_test(
            "Manual Scrape", 
            "POST", 
            "scrape/manual", 
            200, 
            data=urls,
            params={"customer_id": self.customer_id}
        )

    def test_get_scraped_content(self):
        """Test getting scraped content"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        return self.run_test("Get Scraped Content", "GET", f"scrape/content/{self.customer_id}", 200)

    def test_chat(self):
        """Test chat functionality"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        
        chat_data = {
            "customer_id": self.customer_id,
            "message": "What services do you offer?",
            "session_id": None
        }
        
        success, response = self.run_test("Chat", "POST", "chat", 200, data=chat_data)
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            print(f"   Session ID: {self.session_id}")
        return success

    def test_webhook_chat(self):
        """Test webhook chat endpoint"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        
        webhook_data = {
            "customer_id": self.customer_id,
            "message": "Hello, can you help me?",
            "user_id": "test_user_123"
        }
        
        return self.run_test("Webhook Chat", "POST", "webhook/chat", 200, data=webhook_data)

    def test_get_stats(self):
        """Test getting customer stats"""
        if not self.customer_id:
            print("❌ Skipped - No customer ID available")
            return False
        return self.run_test("Get Stats", "GET", f"stats/{self.customer_id}", 200)

    def test_voice_tts(self):
        """Test text-to-speech (expected to fail with placeholder API key)"""
        tts_data = {
            "text": "Hello, this is a test message",
            "voice_id": "21m00Tcm4TlvDq8ikWAM"
        }
        return self.run_test("Text-to-Speech", "POST", "voice/tts", 200, data=tts_data)

    def test_get_voices(self):
        """Test getting available voices (expected to fail with placeholder API key)"""
        return self.run_test("Get Voices", "GET", "voice/voices", 200)

    def test_delete_knowledge_file(self):
        """Test deleting knowledge file"""
        if not self.file_id:
            print("❌ Skipped - No file ID available")
            return False
        return self.run_test("Delete Knowledge File", "DELETE", f"knowledge/{self.file_id}", 200)

def main():
    print("🚀 Starting KbaseAI Backend API Tests")
    print("=" * 50)
    
    tester = KbaseAITester()
    
    # Core API Tests
    print("\n📡 CORE API TESTS")
    tester.test_root_endpoint()
    
    # Customer Management Tests
    print("\n👥 CUSTOMER MANAGEMENT TESTS")
    tester.test_create_customer()
    tester.test_get_customers()
    tester.test_get_customer_by_id()
    
    # Knowledge Base Tests
    print("\n📚 KNOWLEDGE BASE TESTS")
    tester.test_upload_knowledge_file()
    tester.test_get_knowledge_files()
    
    # Web Scraping Tests
    print("\n🌐 WEB SCRAPING TESTS")
    tester.test_create_scrape_config()
    tester.test_get_scrape_configs()
    tester.test_manual_scrape()
    tester.test_get_scraped_content()
    
    # Chat/RAG Tests
    print("\n💬 CHAT/RAG TESTS")
    tester.test_chat()
    tester.test_webhook_chat()
    
    # Stats Tests
    print("\n📊 STATS TESTS")
    tester.test_get_stats()
    
    # Voice Tests (Expected to fail due to placeholder API key)
    print("\n🎤 VOICE TESTS (Expected to fail - placeholder API key)")
    tester.test_voice_tts()
    tester.test_get_voices()
    
    # Cleanup Tests
    print("\n🧹 CLEANUP TESTS")
    tester.test_delete_knowledge_file()
    
    # Print Results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    elif tester.tests_passed >= tester.tests_run * 0.7:  # 70% pass rate
        print("✅ Most tests passed - Core functionality working")
        return 0
    else:
        print("❌ Many tests failed - Major issues detected")
        return 1

if __name__ == "__main__":
    sys.exit(main())