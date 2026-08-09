import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

export interface IFolderAttributes {
  id?: string;
  name: string;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Folder extends Model<IFolderAttributes> implements IFolderAttributes {
  public id!: string;
  public name!: string;
  public ownerId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Folder.init(
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
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'Folder',
    tableName: 'folders',
    timestamps: true,
  }
);

User.hasMany(Folder, { foreignKey: 'ownerId', as: 'folders' });
Folder.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

export default Folder;
