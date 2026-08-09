import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import Folder from './Folder';
import User from './User';

export interface IFolderShareAttributes {
  id?: string;
  folderId: string;
  sharedWithUserId: string;
  permission: 'view' | 'upload';
  createdAt?: Date;
  updatedAt?: Date;
}

export class FolderShare extends Model<IFolderShareAttributes> implements IFolderShareAttributes {
  public id!: string;
  public folderId!: string;
  public sharedWithUserId!: string;
  public permission!: 'view' | 'upload';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associated models
  public folder!: Folder;
  public sharedWithUser!: User;
}

FolderShare.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    folderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Folder,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    sharedWithUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    permission: {
      type: DataTypes.ENUM('view', 'upload'),
      allowNull: false,
      defaultValue: 'view',
    },
  },
  {
    sequelize,
    modelName: 'FolderShare',
    tableName: 'folder_shares',
    timestamps: true,
  }
);

Folder.hasMany(FolderShare, { foreignKey: 'folderId', as: 'folderShares' });
FolderShare.belongsTo(Folder, { foreignKey: 'folderId', as: 'folder' });

User.hasMany(FolderShare, { foreignKey: 'sharedWithUserId', as: 'receivedShares' });
FolderShare.belongsTo(User, { foreignKey: 'sharedWithUserId', as: 'sharedWithUser' });

export default FolderShare;
