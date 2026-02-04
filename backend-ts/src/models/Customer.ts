import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  id: string;
  name: string;
  webhook_url?: string;
  created_at: Date;
}

const customerSchema = new Schema<ICustomer>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  webhook_url: { type: String },
  created_at: { type: Date, default: Date.now }
});

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);