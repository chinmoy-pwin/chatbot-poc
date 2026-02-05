import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Globe, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [stats, setStats] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadStats(selectedCustomer.id);
      localStorage.setItem('selectedCustomerId', selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
      
      // Auto-select first customer or previously selected
      const savedCustomerId = localStorage.getItem('selectedCustomerId');
      if (savedCustomerId) {
        const saved = response.data.find(c => c.id === savedCustomerId);
        if (saved) setSelectedCustomer(saved);
      } else if (response.data.length > 0) {
        setSelectedCustomer(response.data[0]);
      }
    } catch (error) {
      toast.error("Failed to load customers");
    }
  };

  const loadStats = async (customerId) => {
    try {
      const response = await api.get(`/stats/${customerId}`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load stats", error);
    }
  };

  const createCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error("Please enter a customer name");
      return;
    }
    
    try {
      const response = await api.post('/customers', { name: newCustomerName });
      toast.success("Customer created successfully");
      setNewCustomerName("");
      setShowCreateForm(false);
      await loadCustomers();
      setSelectedCustomer(response.data);
    } catch (error) {
      toast.error("Failed to create customer");
    }
  };

  return (
    <div className="p-6 md:p-12 space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Manage your AI chatbot agents</p>
      </div>

      {/* Customer Selection */}
      <Card data-testid="customer-selection-card">
        <CardHeader>
          <CardTitle>Select Customer</CardTitle>
          <CardDescription>Choose a customer to view their chatbot configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {customers && customers.length > 0 && customers.map((customer) => (
              <Button
                key={customer.id}
                data-testid={`customer-${customer.id}`}
                variant={selectedCustomer?.id === customer.id ? "default" : "outline"}
                onClick={() => setSelectedCustomer(customer)}
                className="rounded-full"
              >
                {customer.name}
              </Button>
            ))}
          </div>
          
          {showCreateForm ? (
            <div className="space-y-3 pt-4 border-t">
              <Label htmlFor="customer-name">New Customer Name</Label>
              <div className="flex gap-2">
                <Input
                  id="customer-name"
                  data-testid="new-customer-input"
                  placeholder="Enter customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createCustomer()}
                />
                <Button data-testid="save-customer-btn" onClick={createCustomer}>Save</Button>
                <Button data-testid="cancel-customer-btn" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button 
              data-testid="create-customer-btn"
              variant="outline" 
              onClick={() => setShowCreateForm(true)}
              className="w-full rounded-full"
            >
              + Create New Customer
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedCustomer && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="stats-grid">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Knowledge Files</CardTitle>
              <FileText className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="kb-files-count">{stats.knowledge_files}</div>
              <p className="text-xs text-muted-foreground mt-1">Uploaded documents</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scraped Pages</CardTitle>
              <Globe className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="scraped-pages-count">{stats.scraped_pages}</div>
              <p className="text-xs text-muted-foreground mt-1">Website content</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <MessageSquare className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="conversations-count">{stats.conversations}</div>
              <p className="text-xs text-muted-foreground mt-1">Chat interactions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Webhook Info */}
      {selectedCustomer && (
        <Card data-testid="webhook-info-card">
          <CardHeader>
            <CardTitle>Webhook Integration</CardTitle>
            <CardDescription>Use this endpoint to integrate the chatbot into your website</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-secondary p-4 rounded-lg font-mono text-sm" data-testid="webhook-url">
              {`${BACKEND_URL}/api/webhook/chat`}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Customer ID: <span className="font-mono font-semibold" data-testid="customer-id">{selectedCustomer.id}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}