import mongoose, { Document } from 'mongoose';
export interface IActivity extends Document {
    user: mongoose.Types.ObjectId;
    operation: string;
    fileName: string;
    status: 'success' | 'failed' | 'pending';
    details?: string;
    fileSize?: number;
    createdAt: Date;
}
declare const _default: mongoose.Model<IActivity, {}, {}, {}, mongoose.Document<unknown, {}, IActivity, {}, {}> & IActivity & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Activity.d.ts.map