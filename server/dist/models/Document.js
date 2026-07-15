"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Document = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("./User"));
class Document extends sequelize_1.Model {
    // Compatibility getter
    get _id() {
        return this.id;
    }
    // Compatibility field for owner reference
    get owner() {
        return this.ownerId;
    }
}
exports.Document = Document;
Document.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    ownerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    originalName: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    fileName: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    filePath: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false,
    },
    mimeType: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    size: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
    },
    category: {
        type: sequelize_1.DataTypes.ENUM('pdf', 'image', 'word', 'excel', 'ppt', 'text', 'other'),
        allowNull: false,
        defaultValue: 'other',
    },
    tags: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    isDeleted: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    sequelize: db_1.default,
    modelName: 'Document',
    tableName: 'documents',
    timestamps: true,
});
// Define associations
User_1.default.hasMany(Document, { foreignKey: 'ownerId', as: 'documents' });
Document.belongsTo(User_1.default, { foreignKey: 'ownerId', as: 'owner' });
exports.default = Document;
//# sourceMappingURL=Document.js.map