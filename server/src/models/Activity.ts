import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

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

export class Activity extends Model<IActivityAttributes> implements IActivityAttributes {
  public id!: string;
  public userId!: string;
  public operation!: string;
  public fileName!: string;
  public status!: 'success' | 'failed' | 'pending';
  public details!: string | null;
  public fileSize!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Compatibility getter
  public get _id(): string {
    return this.id;
  }
}

Activity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    operation: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'pending'),
      allowNull: false,
      defaultValue: 'success',
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'Activity',
    tableName: 'activities',
    timestamps: true,
  }
);

// Associations
User.hasMany(Activity, { foreignKey: 'userId', as: 'activities' });
Activity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Activity;
