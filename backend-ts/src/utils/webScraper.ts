import axios from 'axios';
import * as cheerio from 'cheerio';

export class WebScraper {
  static async scrapeUrl(url: string): Promise<string> {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const $ = cheerio.load(response.data);

      // Remove script and style elements
      $('script, style').remove();

      // Get text content
      const text = $('body').text();

      // Clean up text
      return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    } catch (error) {
      throw new Error(`Failed to scrape ${url}: ${error}`);
    }
  }
}