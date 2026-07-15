import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

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

export class Document extends Model<IDocumentAttributes> implements IDocumentAttributes {
  public id!: string;
  public ownerId!: string;
  public originalName!: string;
  public fileName!: string;
  public filePath!: string;
  public mimeType!: string;
  public size!: number;
  public category!: 'pdf' | 'image' | 'word' | 'excel' | 'ppt' | 'text' | 'other';
  public tags!: string[];
  public isDeleted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Compatibility getter
  public get _id(): string {
    return this.id;
  }
  
  // Compatibility field for owner reference
  public get owner(): string {
    return this.ownerId;
  }
}

Document.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    category: {
      type: DataTypes.ENUM('pdf', 'image', 'word', 'excel', 'ppt', 'text', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
    timestamps: true,
  }
);

// Define associations
User.hasMany(Document, { foreignKey: 'ownerId', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

export default Document;
