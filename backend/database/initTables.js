const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'railway',
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0
};

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'coordinator', 'user') NOT NULL DEFAULT 'user',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  phone VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  type ENUM('diplomado', 'magister') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  location VARCHAR(200) DEFAULT NULL,
  equipment JSON DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  program_id INT NOT NULL,
  room_id INT DEFAULT NULL,
  created_by INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  estimated_attendees INT DEFAULT 0,
  actual_attendees INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_attendees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('registered', 'confirmed', 'attended', 'absent') NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  cost_per_person DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  provider VARCHAR(150) DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  service_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schedule_conflicts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id_1 INT NOT NULL,
  activity_id_2 INT NOT NULL,
  type ENUM('room', 'time', 'attendee') NOT NULL,
  description TEXT DEFAULT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT DEFAULT NULL,
  old_values JSON DEFAULT NULL,
  new_values JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'conflict', 'reminder') NOT NULL DEFAULT 'info',
  \`read\` BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  total_registered INT NOT NULL DEFAULT 0,
  total_attended INT NOT NULL DEFAULT 0,
  attendance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

async function initTables() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('🔄 Creando tablas...');
    
    const statements = createTablesSQL.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }
    
    console.log('✅ Tablas creadas correctamente');
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 Tablas creadas:', tables.map(t => Object.values(t)[0]).join(', '));
    
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      console.log('🔄 Creando usuario admin por defecto...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      await connection.query(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        ['Administrador', 'admin@academico.cl', passwordHash, 'admin', '+56912345678']
      );
      console.log('✅ Usuario admin creado: admin@academico.cl / admin123');
    } else {
      console.log('📋 Usuarios ya existentes:', users[0].count);
    }
    
    const [programs] = await connection.query('SELECT COUNT(*) as count FROM programs');
    if (programs[0].count === 0) {
      console.log('🔄 Creando programas de ejemplo...');
      await connection.query(`
        INSERT INTO programs (name, description, type, start_date, end_date) VALUES
        ('Diplomado en Gestión de Proyectos', 'Programa de especialización en metodologías ágiles y gestión de proyectos empresariales.', 'diplomado', '2026-03-01', '2026-08-30'),
        ('Diplomado en Inteligencia Artificial Aplicada', 'Fundamentos y aplicaciones prácticas de IA en entornos empresariales.', 'diplomado', '2026-04-15', '2026-10-15'),
        ('Magíster en Administración de Empresas (MBA)', 'Programa avanzado de gestión empresarial con enfoque en innovación y liderazgo.', 'magister', '2026-03-01', '2027-12-31'),
        ('Diplomado en Ciberseguridad', 'Técnicas y herramientas para la protección de sistemas e información digital.', 'diplomado', '2026-05-01', '2026-11-30'),
        ('Magíster en Ciencia de Datos', 'Programa avanzado en análisis de datos, machine learning y visualización.', 'magister', '2026-03-15', '2027-12-15')
      `);
      console.log('✅ Programas de ejemplo creados');
    }
    
    const [rooms] = await connection.query('SELECT COUNT(*) as count FROM rooms');
    if (rooms[0].count === 0) {
      console.log('🔄 Creando salas de ejemplo...');
      await connection.query(`
        INSERT INTO rooms (name, capacity, location, equipment) VALUES
        ('Sala Auditorio Principal', 120, 'Edificio A, Piso 1', '["proyector_4k", "sistema_audio", "microfono_inalambrico"]'),
        ('Sala B-201', 40, 'Edificio B, Piso 2', '["proyector", "pizarra_blanca", "wifi"]'),
        ('Sala B-202', 40, 'Edificio B, Piso 2', '["proyector", "pizarra_blanca", "wifi"]'),
        ('Sala C-301 (Lab)', 30, 'Edificio C, Piso 3', '["computadores", "proyector", "pizarra_digital"]'),
        ('Sala D-101 (Ejecutiva)', 15, 'Edificio D, Piso 1', '["smart_tv", "videoconferencia", "wifi_premium"]')
      `);
      console.log('✅ Salas de ejemplo creadas');
    }
    
    const [services] = await connection.query('SELECT COUNT(*) as count FROM services');
    if (services[0].count === 0) {
      console.log('🔄 Creando servicios de ejemplo...');
      await connection.query(`
        INSERT INTO services (name, description, cost_per_person, provider) VALUES
        ('Coffee Break Básico', 'Café, té, agua, galletas y fruta de temporada', 3500, 'Catering Los Andes'),
        ('Coffee Break Premium', 'Café especial, jugos naturales, sándwiches, pasteles', 6500, 'Catering Los Andes'),
        ('Kit de Materiales', 'Carpeta, cuaderno, lápiz, credencial impresa', 4500, 'Imprenta Rápida'),
        ('Almuerzo Ejecutivo', 'Menú completo con entrée, plato principal, postre y bebida', 12000, 'Restaurante Gourmet'),
        ('Coffee Break Vegetariano', 'Opciones vegetarianas y veganas', 4500, 'Catering Verde')
      `);
      console.log('✅ Servicios de ejemplo creados');
    }
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initTables().then(() => process.exit(0));
}

module.exports = { initTables };