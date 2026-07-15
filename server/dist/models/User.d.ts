import { Model } from 'sequelize';
export interface IUserAttributes {
    id?: string;
    name: string;
    email: string;
    password?: string;
    avatar?: string | null;
    role?: 'user' | 'admin';
    storageUsed?: number;
    storageLimit?: number;
    resetPasswordToken?: string | null;
    resetPasswordExpire?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare class User extends Model<IUserAttributes> implements IUserAttributes {
    id: string;
    name: string;
    email: string;
    password: string;
    avatar: string | null;
    role: 'user' | 'admin';
    storageUsed: number;
    storageLimit: number;
    resetPasswordToken: string | null;
    resetPasswordExpire: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    get _id(): string;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export default User;
//# sourceMappingURL=User.d.ts.map