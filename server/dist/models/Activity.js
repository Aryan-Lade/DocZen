"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("./User"));
class Activity extends sequelize_1.Model {
    // Compatibility getter
    get _id() {
        return this.id;
    }
}
exports.Activity = Activity;
Activity.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    operation: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    fileName: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('success', 'failed', 'pending'),
        allowNull: false,
        defaultValue: 'success',
    },
    details: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
    },
    fileSize: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: true,
        defaultValue: null,
    },
}, {
    sequelize: db_1.default,
    modelName: 'Activity',
    tableName: 'activities',
    timestamps: true,
});
// Associations
User_1.default.hasMany(Activity, { foreignKey: 'userId', as: 'activities' });
Activity.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
exports.default = Activity;
//# sourceMappingURL=Activity.js.map