import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/db';

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

export class User extends Model<IUserAttributes> implements IUserAttributes {
  public id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public avatar!: string | null;
  public role!: 'user' | 'admin';
  public storageUsed!: number;
  public storageLimit!: number;
  public resetPasswordToken!: string | null;
  public resetPasswordExpire!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Compatibility getter
  public get _id(): string {
    return this.id;
  }

  // Instance method: compare password
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    storageUsed: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    storageLimit: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 1024 * 1024 * 1024, // 1GB
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    resetPasswordExpire: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ['password'] },
      },
    },
    hooks: {
      beforeSave: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export default User;
