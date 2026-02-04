import mongoose, { Document, Schema } from 'mongoose';

export interface IScrapeConfig extends Document {
  id: string;
  customer_id: string;
  urls: string[];
  schedule: string;
  auto_scrape: boolean;
  created_at: Date;
}

const scrapeConfigSchema = new Schema<IScrapeConfig>({
  id: { type: String, required: true, unique: true },
  customer_id: { type: String, required: true },
  urls: { type: [String], required: true },
  schedule: { type: String, default: '0 0 * * *' },
  auto_scrape: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

export const ScrapeConfig = mongoose.model<IScrapeConfig>('ScrapeConfig', scrapeConfigSchema);