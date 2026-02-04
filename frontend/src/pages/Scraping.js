import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Scraping() {
  const [urls, setUrls] = useState(['']);
  const [schedule, setSchedule] = useState('0 0 * * *');
  const [autoScrape, setAutoScrape] = useState(false);
  const [scrapedContent, setScrapedContent] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [customerId, setCustomerId] = useState(null);

  useEffect(() => {
    const savedCustomerId = localStorage.getItem('selectedCustomerId');
    if (savedCustomerId) {
      setCustomerId(savedCustomerId);
      loadScrapedContent(savedCustomerId);
    }
  }, []);

  const loadScrapedContent = async (customerId) => {
    try {
      const response = await axios.get(`${API}/scrape/content/${customerId}`);
      setScrapedContent(response.data);
    } catch (error) {
      toast.error("Failed to load scraped content");
    }
  };

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const updateUrl = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const removeUrl = (index) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const saveConfig = async () => {
    if (!customerId) {
      toast.error("Please select a customer first from the Dashboard");
      return;
    }

    const validUrls = urls.filter(url => url.trim() !== '');
    if (validUrls.length === 0) {
      toast.error("Please add at least one URL");
      return;
    }

    try {
      await axios.post(`${API}/scrape/config`, {
        customer_id: customerId,
        urls: validUrls,
        schedule,
        auto_scrape: autoScrape
      });
      toast.success("Scraping configuration saved");
    } catch (error) {
      toast.error("Failed to save configuration");
    }
  };

  const manualScrape = async () => {
    if (!customerId) {
      toast.error("Please select a customer first from the Dashboard");
      return;
    }

    const validUrls = urls.filter(url => url.trim() !== '');
    if (validUrls.length === 0) {
      toast.error("Please add at least one URL");
      return;
    }

    setScraping(true);
    try {
      const response = await axios.post(`${API}/scrape/manual`, validUrls, {
        params: { customer_id: customerId }
      });
      toast.success(`Successfully scraped ${response.data.results.length} pages`);
      loadScrapedContent(customerId);
    } catch (error) {
      toast.error("Failed to scrape websites");
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="p-6 md:p-12 space-y-8" data-testid="scraping-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="scraping-title">Web Scraping</h1>
        <p className="text-muted-foreground">Configure website scraping for your chatbot</p>
      </div>

      {/* Configuration */}
      <Card data-testid="scraping-config-card">
        <CardHeader>
          <CardTitle>Scraping Configuration</CardTitle>
          <CardDescription>Add URLs to scrape for knowledge base content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL Inputs */}
          <div className="space-y-3">
            <Label>Website URLs</Label>
            {urls && urls.length > 0 ? urls.map((url, index) => {
              const urlKey = `url-${index}`;
              return (
                <div key={urlKey} className="flex gap-2">
                  <Input
                    data-testid={`url-input-${index}`}
                    placeholder="https://example.com/blog"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    className="flex-1"
                  />
                  {urls.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`remove-url-${index}`}
                      onClick={() => removeUrl(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            }) : null}
            <Button
              variant="outline"
              data-testid="add-url-btn"
              onClick={addUrlField}
              className="w-full rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add URL
            </Button>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <Label htmlFor="schedule">Cron Schedule (for auto-scraping)</Label>
            <Input
              id="schedule"
              data-testid="schedule-input"
              placeholder="0 0 * * * (Daily at midnight)"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Format: minute hour day month weekday (e.g., "0 0 * * *" for daily at midnight)
            </p>
          </div>

          {/* Auto Scrape Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-scrape">Enable Auto-Scraping</Label>
              <p className="text-sm text-muted-foreground">Automatically scrape URLs on schedule</p>
            </div>
            <Switch
              id="auto-scrape"
              data-testid="auto-scrape-switch"
              checked={autoScrape}
              onCheckedChange={setAutoScrape}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              data-testid="save-config-btn"
              onClick={saveConfig}
              className="rounded-full"
            >
              Save Configuration
            </Button>
            <Button
              variant="outline"
              data-testid="manual-scrape-btn"
              onClick={manualScrape}
              disabled={scraping}
              className="rounded-full"
            >
              {scraping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Scrape Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scraped Content */}
      <Card data-testid="scraped-content-card">
        <CardHeader>
          <CardTitle>Scraped Content</CardTitle>
          <CardDescription>{scrapedContent.length} pages scraped</CardDescription>
        </CardHeader>
        <CardContent>
          {scrapedContent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-content-message">
              No content scraped yet
            </div>
          ) : (
            <div className="space-y-2">
              {scrapedContent && scrapedContent.length > 0 ? scrapedContent.map((item) => {
                const itemId = item.id;
                const itemUrl = item.url;
                const scrapedAt = item.scraped_at;
                return (
                  <div
                    key={itemId}
                    data-testid={`scraped-item-${itemId}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium" data-testid={`scraped-url-${itemId}`}>{itemUrl}</p>
                        <p className="text-sm text-muted-foreground">
                          Scraped {new Date(scrapedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}