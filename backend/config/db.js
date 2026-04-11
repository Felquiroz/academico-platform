const mysql = require('mysql2/promise');
require('dotenv').config();

let dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'academico_platform',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
  dateStrings: true
};

console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', ''),
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      waitForConnections: true,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+00:00',
      dateStrings: true
    };
    console.log('🔍 DB Config:', { host: dbConfig.host, port: dbConfig.port, user: dbConfig.user, database: dbConfig.database });
  } catch (e) {
    console.error('❌ Error parseando DATABASE_URL:', e.message);
  }
}

const pool = mysql.createPool(dbConfig);

// Test de conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL conectado exitosamente a:', process.env.DB_NAME || dbConfig.database);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    console.error('❌ Detalles:', err.stack);
    process.exit(1);
  });

module.exports = pool;
