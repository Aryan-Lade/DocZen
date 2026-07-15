import { Sequelize } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

let sequelize: Sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: databaseUrl.includes('railway') || process.env.MYSQL_SSL === 'true' ? {
        rejectUnauthorized: false
      } : undefined
    }
  });
} else {
  const host = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306');
  const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME || 'docfusion';

  sequelize = new Sequelize(database, user, password, {
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

export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Connected successfully via Sequelize');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');
  } catch (error) {
    console.error('❌ MySQL connection error:', error);
    process.exit(1);
  }
};

export default sequelize;
