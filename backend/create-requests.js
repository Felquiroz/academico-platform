const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'fi02lm24',
  database: 'academico_platform'
});

async function createTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('room', 'activity', 'service', 'general') NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT DEFAULT NULL,
        requested_by INT NOT NULL,
        program_id INT DEFAULT NULL,
        room_id INT DEFAULT NULL,
        activity_id INT DEFAULT NULL,
        start_time DATETIME DEFAULT NULL,
        end_time DATETIME DEFAULT NULL,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
        reviewed_by INT DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Tabla requests creada correctamente');
  } catch (err) {
    console.log('Tabla ya existe o error:', err.message);
  }
  await pool.end();
}

createTable();