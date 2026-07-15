import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  owner: mongoose.Types.ObjectId;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  category: 'pdf' | 'image' | 'word' | 'excel' | 'ppt' | 'text' | 'other';
  tags: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, unique: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, default: 0 },
    category: {
      type: String,
      enum: ['pdf', 'image', 'word', 'excel', 'ppt', 'text', 'other'],
      default: 'other',
    },
    tags: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Text index for search
DocumentSchema.index({ originalName: 'text', tags: 'text' });

export default mongoose.model<IDocument>('Document', DocumentSchema);
