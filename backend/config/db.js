const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
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
  // Importante para que devuelva fechas como strings y no objetos Date
  dateStrings: true
});

// Test de conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL conectado exitosamente a:', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  });

module.exports = pool;
