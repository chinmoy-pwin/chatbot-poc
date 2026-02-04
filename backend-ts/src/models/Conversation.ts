import mongoose, { Document, Schema } from 'mongoose';

interface IMessage {
  role: string;
  content: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  customer_id: string;
  session_id: string;
  messages: IMessage[];
}

const conversationSchema = new Schema<IConversation>({
  customer_id: { type: String, required: true },
  session_id: { type: String, required: true },
  messages: [{
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
});

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);