// MongoDB Sample Data Insertion Script for KbaseAI
// Run this script using: mongosh < sample_data.js

// Switch to database
use test_database;

print("=== Inserting Sample Data into KbaseAI Database ===\n");

// Helper function to generate UUID v4 (simplified)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Sample Customer 1: Tech Startup
const customer1Id = generateUUID();
print("Creating customer: Tech Startup...");
db.customers.insertOne({
  id: customer1Id,
  name: "Tech Startup Inc",
  webhook_url: "https://techstartup.example.com/webhook",
  created_at: new Date()
});

// Sample Customer 2: E-commerce Store
const customer2Id = generateUUID();
print("Creating customer: E-commerce Store...");
db.customers.insertOne({
  id: customer2Id,
  name: "ShopNow E-commerce",
  webhook_url: "https://shopnow.example.com/api/chatbot",
  created_at: new Date()
});

// Knowledge Files for Customer 1
print("\nAdding knowledge files for Tech Startup...");

const kbFile1Id = generateUUID();
db.knowledgefiles.insertOne({
  id: kbFile1Id,
  customer_id: customer1Id,
  filename: "product_features.pdf",
  file_type: "pdf",
  content: `Product Features Overview

Our platform offers the following key features:

1. Real-time Analytics Dashboard
   - Live metrics and KPIs
   - Custom report builder
   - Data export in multiple formats

2. API Integration
   - RESTful API with comprehensive documentation
   - Webhook support for real-time updates
   - SDKs available for popular languages

3. Security & Compliance
   - End-to-end encryption
   - SOC 2 Type II certified
   - GDPR compliant
   - Regular security audits

4. Collaboration Tools
   - Team workspaces
   - Role-based access control
   - Activity tracking and audit logs

5. 24/7 Customer Support
   - Live chat support
   - Email and phone support
   - Comprehensive knowledge base
   - Video tutorials`,
  uploaded_at: new Date()
});

const kbFile2Id = generateUUID();
db.knowledgefiles.insertOne({
  id: kbFile2Id,
  customer_id: customer1Id,
  filename: "pricing_plans.txt",
  file_type: "txt",
  content: `Pricing Plans

Starter Plan - $29/month
- Up to 5 team members
- 10GB storage
- Basic analytics
- Email support

Professional Plan - $99/month
- Up to 25 team members
- 100GB storage
- Advanced analytics
- Priority email and chat support
- API access

Enterprise Plan - Custom pricing
- Unlimited team members
- Unlimited storage
- Custom analytics
- Dedicated account manager
- 24/7 phone support
- Custom integrations
- SLA guarantee

All plans include:
- 14-day free trial
- No credit card required
- Cancel anytime
- Monthly or annual billing`,
  uploaded_at: new Date()
});

// Knowledge Files for Customer 2
print("Adding knowledge files for E-commerce Store...");

const kbFile3Id = generateUUID();
db.knowledgefiles.insertOne({
  id: kbFile3Id,
  customer_id: customer2Id,
  filename: "shipping_policy.docx",
  file_type: "docx",
  content: `Shipping Policy

Shipping Methods:
- Standard Shipping (5-7 business days): FREE on orders over $50
- Express Shipping (2-3 business days): $9.99
- Overnight Shipping (1 business day): $24.99

International Shipping:
We ship to over 100 countries worldwide. International shipping rates are calculated at checkout based on destination and package weight.

Order Processing:
Orders are processed within 1-2 business days. You will receive a tracking number via email once your order ships.

Delivery Issues:
If your package is lost or damaged during shipping, please contact us within 48 hours of delivery. We will work with the carrier to resolve the issue.`,
  uploaded_at: new Date()
});

const kbFile4Id = generateUUID();
db.knowledgefiles.insertOne({
  id: kbFile4Id,
  customer_id: customer2Id,
  filename: "return_policy.json",
  file_type: "json",
  content: JSON.stringify({
    "return_policy": {
      "return_window": "30 days",
      "conditions": [
        "Items must be unused and in original packaging",
        "Include all tags and accessories",
        "Provide proof of purchase"
      ],
      "non_returnable_items": [
        "Personalized items",
        "Gift cards",
        "Final sale items",
        "Opened beauty products"
      ],
      "refund_process": {
        "processing_time": "5-7 business days after receiving return",
        "refund_method": "Original payment method",
        "shipping_cost": "Customer pays return shipping unless item is defective"
      },
      "exchanges": {
        "available": true,
        "process": "Contact customer service to initiate exchange",
        "shipping": "Free for defective items, customer pays for preference exchanges"
      }
    }
  }, null, 2),
  uploaded_at: new Date()
});

// Scraped Content for Customer 1
print("\nAdding scraped content for Tech Startup...");

const scrapedContent1Id = generateUUID();
db.scrapedcontents.insertOne({
  id: scrapedContent1Id,
  customer_id: customer1Id,
  url: "https://techstartup.example.com/blog/latest-update",
  content: `Product Update: Q1 2024

We're excited to announce several new features and improvements:

New Dashboard Design
We've completely redesigned our analytics dashboard with a focus on usability and performance. The new interface is faster, more intuitive, and provides better insights.

Enhanced API
Version 2.0 of our API is now available with improved documentation, better error handling, and new endpoints for advanced functionality.

Mobile App Launch
Our iOS and Android apps are now available in the App Store and Google Play. Get the same powerful features on the go.

Improved Performance
We've optimized our backend infrastructure, resulting in 50% faster load times and better reliability.

What's Next
In Q2, we'll be launching advanced automation features, expanded integrations, and an AI-powered assistant.`,
  scraped_at: new Date()
});

// Scraped Content for Customer 2
print("Adding scraped content for E-commerce Store...");

const scrapedContent2Id = generateUUID();
db.scrapedcontents.insertOne({
  id: scrapedContent2Id,
  customer_id: customer2Id,
  url: "https://shopnow.example.com/help/faq",
  content: `Frequently Asked Questions

Q: Do you offer gift wrapping?
A: Yes! Gift wrapping is available for $5 per item. You can add this option at checkout.

Q: Can I track my order?
A: Absolutely. Once your order ships, you'll receive a tracking number via email. You can also track your order by logging into your account.

Q: What payment methods do you accept?
A: We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, and Google Pay.

Q: How do I contact customer service?
A: You can reach us via:
- Live chat (available 9 AM - 9 PM EST)
- Email: support@shopnow.example.com
- Phone: 1-800-SHOP-NOW

Q: Do you have physical stores?
A: We're currently online-only, but we're planning to open physical locations in select cities in 2024.`,
  scraped_at: new Date()
});

// Scrape Configs
print("\nCreating scrape configurations...");

const scrapeConfig1Id = generateUUID();
db.scrapeconfigs.insertOne({
  id: scrapeConfig1Id,
  customer_id: customer1Id,
  urls: [
    "https://techstartup.example.com/blog",
    "https://techstartup.example.com/docs",
    "https://techstartup.example.com/changelog"
  ],
  schedule: "0 2 * * *", // Daily at 2 AM
  auto_scrape: true,
  created_at: new Date()
});

const scrapeConfig2Id = generateUUID();
db.scrapeconfigs.insertOne({
  id: scrapeConfig2Id,
  customer_id: customer2Id,
  urls: [
    "https://shopnow.example.com/help",
    "https://shopnow.example.com/policies"
  ],
  schedule: "0 0 * * 0", // Weekly on Sunday at midnight
  auto_scrape: true,
  created_at: new Date()
});

// Sample Conversations
print("\nCreating sample conversations...");

// Conversation for Customer 1
db.conversations.insertOne({
  customer_id: customer1Id,
  session_id: "session-tech-001",
  messages: [
    {
      role: "user",
      content: "What are your pricing plans?",
      timestamp: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      role: "assistant",
      content: "We offer three pricing plans:\n\n1. Starter Plan at $29/month - Perfect for small teams with up to 5 members, 10GB storage, and basic analytics.\n\n2. Professional Plan at $99/month - Great for growing teams with up to 25 members, 100GB storage, advanced analytics, and API access.\n\n3. Enterprise Plan with custom pricing - Designed for large organizations with unlimited members, storage, and premium support.\n\nAll plans include a 14-day free trial. Would you like more details about any specific plan?",
      timestamp: new Date(Date.now() - 86400000 + 5000)
    },
    {
      role: "user",
      content: "Does the Professional plan include API access?",
      timestamp: new Date(Date.now() - 86400000 + 60000)
    },
    {
      role: "assistant",
      content: "Yes! The Professional Plan includes full API access with comprehensive documentation, webhook support, and SDKs for popular programming languages. This allows you to integrate our platform with your existing tools and workflows.",
      timestamp: new Date(Date.now() - 86400000 + 65000)
    }
  ]
});

// Conversation for Customer 2
db.conversations.insertOne({
  customer_id: customer2Id,
  session_id: "session-shop-001",
  messages: [
    {
      role: "user",
      content: "What's your return policy?",
      timestamp: new Date(Date.now() - 43200000) // 12 hours ago
    },
    {
      role: "assistant",
      content: "Our return policy is simple and customer-friendly:\n\n- You have 30 days to return items\n- Items must be unused and in original packaging\n- Refunds are processed within 5-7 business days\n- Returns are free for defective items, otherwise customer pays return shipping\n\nPlease note that personalized items, gift cards, and opened beauty products cannot be returned. Would you like to know more about the return process?",
      timestamp: new Date(Date.now() - 43200000 + 4000)
    }
  ]
});

db.conversations.insertOne({
  customer_id: customer2Id,
  session_id: "session-shop-002",
  messages: [
    {
      role: "user",
      content: "How long does shipping take?",
      timestamp: new Date(Date.now() - 7200000) // 2 hours ago
    },
    {
      role: "assistant",
      content: "We offer three shipping options:\n\n1. Standard Shipping (5-7 business days) - FREE on orders over $50\n2. Express Shipping (2-3 business days) - $9.99\n3. Overnight Shipping (1 business day) - $24.99\n\nOrders are processed within 1-2 business days, and you'll receive a tracking number via email once your order ships. We also ship internationally to over 100 countries!",
      timestamp: new Date(Date.now() - 7200000 + 3000)
    }
  ]
});

print("\n=== Sample Data Insertion Complete ===");

// Display summary
print("\nData Summary:");
print("- Customers: " + db.customers.countDocuments());
print("- Knowledge Files: " + db.knowledgefiles.countDocuments());
print("- Scraped Content: " + db.scrapedcontents.countDocuments());
print("- Scrape Configs: " + db.scrapeconfigs.countDocuments());
print("- Conversations: " + db.conversations.countDocuments());

print("\nSample Customer IDs:");
print("- Tech Startup Inc: " + customer1Id);
print("- ShopNow E-commerce: " + customer2Id);

print("\n=== Ready to test! ===");
