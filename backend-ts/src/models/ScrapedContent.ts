import mongoose, { Document, Schema } from 'mongoose';

export interface IScrapedContent extends Document {
  id: string;
  customer_id: string;
  url: string;
  content: string;
  scraped_at: Date;
}

const scrapedContentSchema = new Schema<IScrapedContent>({
  id: { type: String, required: true, unique: true },
  customer_id: { type: String, required: true },
  url: { type: String, required: true },
  content: { type: String, required: true },
  scraped_at: { type: Date, default: Date.now }
});

export const ScrapedContent = mongoose.model<IScrapedContent>('ScrapedContent', scrapedContentSchema);