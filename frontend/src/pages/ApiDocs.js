import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ApiDocs() {
  return (
    <div className="p-6 md:p-12 space-y-8" data-testid="api-docs-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="api-docs-title">API Documentation</h1>
        <p className="text-muted-foreground">Integrate the chatbot into your website</p>
      </div>

      <Card data-testid="api-docs-card">
        <CardHeader>
          <CardTitle>Webhook API</CardTitle>
          <CardDescription>Use this endpoint to send chat requests from your website</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="endpoint" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="endpoint" data-testid="tab-endpoint">Endpoint</TabsTrigger>
              <TabsTrigger value="request" data-testid="tab-request">Request</TabsTrigger>
              <TabsTrigger value="response" data-testid="tab-response">Response</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoint" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <div className="bg-secondary p-4 rounded-lg font-mono text-sm" data-testid="base-url">
                  {BACKEND_URL}/api
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Webhook Endpoint</h3>
                <div className="bg-secondary p-4 rounded-lg font-mono text-sm" data-testid="webhook-endpoint">
                  POST {BACKEND_URL}/api/webhook/chat
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Content-Type</h3>
                <div className="bg-secondary p-4 rounded-lg font-mono text-sm">
                  application/json
                </div>
              </div>
            </TabsContent>

            <TabsContent value="request" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Request Body</h3>
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto" data-testid="request-example">
                  <code>{`{
  "customer_id": "your-customer-id-here",
  "message": "What services do you offer?",
  "user_id": "optional-user-session-id"
}`}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">cURL Example</h3>
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm" data-testid="curl-example">
                  <code>{`curl -X POST ${BACKEND_URL}/api/webhook/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "your-customer-id",
    "message": "Hello!",
    "user_id": "user123"
  }'`}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="response" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Success Response (200 OK)</h3>
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto" data-testid="response-example">
                  <code>{`{
  "response": "We offer AI-powered chatbot solutions...",
  "session_id": "abc-123-def-456",
  "sources": [
    "services.pdf",
    "https://example.com/about"
  ]
}`}</code>
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Error Response (500)</h3>
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto">
                  <code>{`{
  "detail": "Error processing webhook chat: [error message]"
}`}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* JavaScript Integration Example */}
      <Card data-testid="integration-card">
        <CardHeader>
          <CardTitle>JavaScript Integration</CardTitle>
          <CardDescription>Example code to integrate the chatbot in your website</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm" data-testid="js-example">
            <code>{`// Simple JavaScript integration
const CUSTOMER_ID = 'your-customer-id-here';
const API_URL = '${BACKEND_URL}/api/webhook/chat';

async function sendMessage(message, userId = null) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: CUSTOMER_ID,
        message: message,
        user_id: userId
      })
    });
    
    const data = await response.json();
    console.log('Bot response:', data.response);
    console.log('Sources:', data.sources);
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example usage
sendMessage('Hello, how can you help me?', 'user-123');`}</code>
          </pre>
        </CardContent>
      </Card>

      {/* React Integration Example */}
      <Card data-testid="react-integration-card">
        <CardHeader>
          <CardTitle>React Integration</CardTitle>
          <CardDescription>Example React component for the chatbot</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm" data-testid="react-example">
            <code>{`import { useState } from 'react';
import axios from 'axios';

const CUSTOMER_ID = 'your-customer-id-here';
const API_URL = '${BACKEND_URL}/api/webhook/chat';

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    
    try {
      const response = await axios.post(API_URL, {
        customer_id: CUSTOMER_ID,
        message: input,
        user_id: 'user-123'
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        sources: response.data.sources
      }]);
      
      setInput('');
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return (
    <div className="chatbot">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      <input 
        value={input} 
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}