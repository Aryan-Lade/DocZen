"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
class User extends sequelize_1.Model {
    // Compatibility getter
    get _id() {
        return this.id;
    }
    // Instance method: compare password
    async comparePassword(candidatePassword) {
        return bcryptjs_1.default.compare(candidatePassword, this.password);
    }
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    avatar: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
    },
    storageUsed: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
    },
    storageLimit: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 1024 * 1024 * 1024, // 1GB
    },
    resetPasswordToken: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
    },
    resetPasswordExpire: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    },
}, {
    sequelize: db_1.default,
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
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcryptjs_1.default.genSalt(12);
                user.password = await bcryptjs_1.default.hash(user.password, salt);
            }
        },
    },
});
exports.default = User;
//# sourceMappingURL=User.js.map