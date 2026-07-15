import { Model } from 'sequelize';
export interface IActivityAttributes {
    id?: string;
    userId: string;
    operation: string;
    fileName: string;
    status?: 'success' | 'failed' | 'pending';
    details?: string | null;
    fileSize?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class Activity extends Model<IActivityAttributes> implements IActivityAttributes {
    id: string;
    userId: string;
    operation: string;
    fileName: string;
    status: 'success' | 'failed' | 'pending';
    details: string | null;
    fileSize: number | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    get _id(): string;
}
export default Activity;
//# sourceMappingURL=Activity.d.ts.map