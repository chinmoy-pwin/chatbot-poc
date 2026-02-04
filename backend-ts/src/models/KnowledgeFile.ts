import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeFile extends Document {
  id: string;
  customer_id: string;
  filename: string;
  file_type: string;
  content: string;
  uploaded_at: Date;
}

const knowledgeFileSchema = new Schema<IKnowledgeFile>({
  id: { type: String, required: true, unique: true },
  customer_id: { type: String, required: true },
  filename: { type: String, required: true },
  file_type: { type: String, required: true },
  content: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now }
});

export const KnowledgeFile = mongoose.model<IKnowledgeFile>('KnowledgeFile', knowledgeFileSchema);