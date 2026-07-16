import { Model } from 'sequelize';
export interface IDocumentAttributes {
    id?: string;
    ownerId: string;
    originalName: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    size: number;
    category: 'pdf' | 'image' | 'word' | 'excel' | 'ppt' | 'text' | 'other';
    tags?: string[];
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class Document extends Model<IDocumentAttributes> implements IDocumentAttributes {
    id: string;
    ownerId: string;
    originalName: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    size: number;
    category: 'pdf' | 'image' | 'word' | 'excel' | 'ppt' | 'text' | 'other';
    tags: string[];
    isDeleted: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    get _id(): string;
    get owner(): string;
}
export default Document;
//# sourceMappingURL=Document.d.ts.map