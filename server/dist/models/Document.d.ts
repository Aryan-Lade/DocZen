import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IDocument, {}, {}, {}, mongoose.Document<unknown, {}, IDocument, {}, {}> & IDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Document.d.ts.map