-- ============================================
-- PLATAFORMA DE GESTIÓN ACADÉMICA
-- Schema SQL - Base de datos completa
-- ============================================

CREATE DATABASE IF NOT EXISTS academico_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE academico_platform;

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'coordinator', 'teacher', 'user', 'student') NOT NULL DEFAULT 'student',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  phone VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: programs
-- ============================================
CREATE TABLE IF NOT EXISTS programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  type ENUM('diplomado', 'magister') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_programs_type (type),
  INDEX idx_programs_active (active)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: rooms
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  location VARCHAR(200) DEFAULT NULL,
  equipment JSON DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rooms_capacity (capacity),
  INDEX idx_rooms_active (active)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: activities
-- ============================================
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_activities_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_activities_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  CONSTRAINT fk_activities_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_activities_program (program_id),
  INDEX idx_activities_room (room_id),
  INDEX idx_activities_status (status),
  INDEX idx_activities_times (start_time, end_time)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: activity_attendees
-- ============================================
CREATE TABLE IF NOT EXISTS activity_attendees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('registered', 'confirmed', 'attended', 'absent') NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendees_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_activity_user (activity_id, user_id),
  INDEX idx_attendees_status (status)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: services
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  cost_per_person DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  provider VARCHAR(150) DEFAULT NULL,
  has_menu_options BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TABLA: service_menu_options
-- ============================================
CREATE TABLE IF NOT EXISTS service_menu_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  option_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_menu_opts_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_menu_opts_service (service_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: menu_choices
-- ============================================
CREATE TABLE IF NOT EXISTS menu_choices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  menu_option_id INT DEFAULT NULL,
  custom_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_menu_choices_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_choices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_choices_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_choices_option FOREIGN KEY (menu_option_id) REFERENCES service_menu_options(id) ON DELETE SET NULL,
  UNIQUE KEY uk_activity_user_service (activity_id, user_id, service_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: activity_services
-- ============================================
CREATE TABLE IF NOT EXISTS activity_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  service_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_act_services_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_act_services_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_activity_service (activity_id, service_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: schedule_conflicts
-- ============================================
CREATE TABLE IF NOT EXISTS schedule_conflicts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id_1 INT NOT NULL,
  activity_id_2 INT NOT NULL,
  type ENUM('room', 'time', 'attendee') NOT NULL,
  description TEXT DEFAULT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conflicts_act1 FOREIGN KEY (activity_id_1) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_conflicts_act2 FOREIGN KEY (activity_id_2) REFERENCES activities(id) ON DELETE CASCADE,
  INDEX idx_conflicts_resolved (resolved)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: audit_logs
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT DEFAULT NULL,
  old_values JSON DEFAULT NULL,
  new_values JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'conflict', 'reminder') NOT NULL DEFAULT 'info',
  `read` BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, `read`),
  INDEX idx_notifications_type (type)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: attendance_history
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  total_registered INT NOT NULL DEFAULT 0,
  total_attended INT NOT NULL DEFAULT 0,
  attendance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_history_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  UNIQUE KEY uk_program_month_year (program_id, month, year)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: refresh_tokens
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_token (token(255)),
  INDEX idx_refresh_expires (expires_at)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: program_enrollments
-- ============================================
CREATE TABLE IF NOT EXISTS program_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  user_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prenroll_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_prenroll_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_program_user (program_id, user_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: requests
-- ============================================
CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('room', 'activity', 'service', 'general') NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT NULL,
  requested_by INT NOT NULL,
  program_id INT DEFAULT NULL,
  room_id INT DEFAULT NULL,
  activity_id INT DEFAULT NULL,
  service_ids JSON DEFAULT NULL,
  start_time DATETIME DEFAULT NULL,
  end_time DATETIME DEFAULT NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_requests_user FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_requests_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
  CONSTRAINT fk_requests_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  CONSTRAINT fk_requests_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
  CONSTRAINT fk_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_requests_status (status),
  INDEX idx_requests_type (type),
  INDEX idx_requests_user (requested_by)
) ENGINE=InnoDB;
