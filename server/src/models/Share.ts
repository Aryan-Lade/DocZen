import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import Document from './Document';
import User from './User';

export interface IShareAttributes {
  id?: string;
  documentId: string;
  ownerId: string;
  token: string;
  password?: string | null;
  expiresAt?: Date | null;
  downloadLimit?: number | null;
  downloadCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Share extends Model<IShareAttributes> implements IShareAttributes {
  public id!: string;
  public documentId!: string;
  public ownerId!: string;
  public token!: string;
  public password!: string | null;
  public expiresAt!: Date | null;
  public downloadLimit!: number | null;
  public downloadCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associated models
  public document!: Document;
  public owner!: User;
}

Share.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Document,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    downloadLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Share',
    tableName: 'shares',
    timestamps: true,
  }
);

Document.hasMany(Share, { foreignKey: 'documentId', as: 'shares' });
Share.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

User.hasMany(Share, { foreignKey: 'ownerId', as: 'shares' });
Share.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

export default Share;
