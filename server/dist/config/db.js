"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
// Load env vars here too — module imports run before index.ts calls dotenv.config()
dotenv_1.default.config();
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
let sequelize;
if (databaseUrl) {
    sequelize = new sequelize_1.Sequelize(databaseUrl, {
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
            ssl: databaseUrl.includes('railway') || process.env.MYSQL_SSL === 'true' ? {
                rejectUnauthorized: false
            } : undefined
        }
    });
}
else {
    const host = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306');
    const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
    const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
    const database = process.env.MYSQLDATABASE || process.env.DB_NAME || 'docfusion';
    sequelize = new sequelize_1.Sequelize(database, user, password, {
        host,
        port,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
            ssl: host.includes('railway') || process.env.MYSQL_SSL === 'true' ? {
                rejectUnauthorized: false
            } : undefined
        }
    });
}
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL Connected successfully via Sequelize');
        // Sync models
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized');
    }
    catch (error) {
        console.error('❌ MySQL connection error:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
exports.default = sequelize;
//# sourceMappingURL=db.js.map