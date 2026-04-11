/**
 * Script para sembrar la base de datos con datos de prueba
 * Genera hashes reales de bcrypt para las contraseñas
 * 
 * Uso: node database/seedRunner.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  try {
    // Generar hashes de contraseñas
    const adminHash = await bcrypt.hash('admin123', 10);
    const coordHash = await bcrypt.hash('coord123', 10);
    const userHash = await bcrypt.hash('user123', 10);

    // Limpiar datos existentes (en orden por FK)
    console.log('🗑️  Limpiando datos existentes...');
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'refresh_tokens', 'attendance_history', 'notifications', 'audit_logs',
      'schedule_conflicts', 'activity_services', 'activity_attendees',
      'activities', 'services', 'rooms', 'programs', 'users'
    ];
    for (const table of tables) {
      await pool.execute(`TRUNCATE TABLE ${table}`);
    }
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

    // USUARIOS
    console.log('👤 Creando usuarios...');
    await pool.execute(`
      INSERT INTO users (name, email, password_hash, role, phone) VALUES
      ('Administrador General', 'admin@academico.cl', ?, 'admin', '+56912345678'),
      ('María González', 'maria.gonzalez@academico.cl', ?, 'coordinator', '+56923456789'),
      ('Carlos Pérez', 'carlos.perez@academico.cl', ?, 'coordinator', '+56934567890'),
      ('Ana Rodríguez', 'ana.rodriguez@academico.cl', ?, 'user', '+56945678901'),
      ('Luis Martínez', 'luis.martinez@academico.cl', ?, 'user', '+56956789012'),
      ('Sofía Hernández', 'sofia.hernandez@academico.cl', ?, 'user', '+56967890123'),
      ('Diego Morales', 'diego.morales@academico.cl', ?, 'user', '+56978901234'),
      ('Valentina Soto', 'valentina.soto@academico.cl', ?, 'user', '+56989012345'),
      ('Fernando López', 'fernando.lopez@academico.cl', ?, 'user', '+56990123456'),
      ('Camila Díaz', 'camila.diaz@academico.cl', ?, 'user', '+56901234567')
    `, [adminHash, coordHash, coordHash, userHash, userHash, userHash, userHash, userHash, userHash, userHash]);

    // PROGRAMAS
    console.log('📚 Creando programas...');
    await pool.execute(`
      INSERT INTO programs (name, description, type, start_date, end_date) VALUES
      ('Diplomado en Gestión de Proyectos', 'Programa de especialización en metodologías ágiles y gestión de proyectos empresariales.', 'diplomado', '2026-03-01', '2026-08-30'),
      ('Diplomado en Inteligencia Artificial Aplicada', 'Fundamentos y aplicaciones prácticas de IA en entornos empresariales.', 'diplomado', '2026-04-15', '2026-10-15'),
      ('Magíster en Administración de Empresas (MBA)', 'Programa avanzado de gestión empresarial con enfoque en innovación y liderazgo.', 'magister', '2026-03-01', '2027-12-31'),
      ('Diplomado en Ciberseguridad', 'Técnicas y herramientas para la protección de sistemas e información digital.', 'diplomado', '2026-05-01', '2026-11-30'),
      ('Magíster en Ciencia de Datos', 'Programa avanzado en análisis de datos, machine learning y visualización.', 'magister', '2026-03-15', '2027-12-15')
    `);

    // SALAS
    console.log('🏫 Creando salas...');
    await pool.execute(`
      INSERT INTO rooms (name, capacity, location, equipment) VALUES
      ('Sala Auditorio Principal', 120, 'Edificio A, Piso 1', '["proyector_4k", "sistema_audio", "microfono_inalambrico", "pizarra_digital", "videoconferencia"]'),
      ('Sala B-201', 40, 'Edificio B, Piso 2', '["proyector", "pizarra_blanca", "wifi", "aire_acondicionado"]'),
      ('Sala B-202', 40, 'Edificio B, Piso 2', '["proyector", "pizarra_blanca", "wifi", "aire_acondicionado"]'),
      ('Sala C-301 (Lab Computación)', 30, 'Edificio C, Piso 3', '["computadores_30", "proyector", "pizarra_digital", "software_especializado"]'),
      ('Sala D-101 (Sala Ejecutiva)', 15, 'Edificio D, Piso 1', '["smart_tv_75", "videoconferencia", "mesa_ejecutiva", "wifi_premium"]'),
      ('Sala A-102 (Sala Magna)', 80, 'Edificio A, Piso 1', '["proyector_4k", "sistema_audio", "microfono", "grabacion_video"]'),
      ('Sala B-203', 25, 'Edificio B, Piso 2', '["proyector", "pizarra_blanca", "wifi"]'),
      ('Sala E-401 (Coworking)', 20, 'Edificio E, Piso 4', '["monitores_individuales", "wifi_premium", "pizarras_multiples"]')
    `);

    // SERVICIOS
    console.log('☕ Creando servicios...');
    await pool.execute(`
      INSERT INTO services (name, description, cost_per_person, provider) VALUES
      ('Coffee Break Básico', 'Café, té, agua, galletas y fruta de temporada', 3500.00, 'Catering Los Andes'),
      ('Coffee Break Premium', 'Café especial, jugos naturales, sándwiches, pasteles artesanales', 6500.00, 'Catering Los Andes'),
      ('Almuerzo Ejecutivo', 'Menú de 3 tiempos con opciones regulares y vegetarianas', 12000.00, 'Restaurant Del Chef'),
      ('Almuerzo Buffet', 'Buffet completo con estaciones de comida variada', 18000.00, 'Restaurant Del Chef'),
      ('Servicio de Agua y Bebidas', 'Agua mineral, bebidas y jugos durante toda la jornada', 2000.00, 'Distribuidora Central'),
      ('Kit de Materiales', 'Carpeta, cuaderno, lápiz, credencial impresa', 4500.00, 'Imprenta Rápida')
    `);

    // ACTIVIDADES
    console.log('📅 Creando actividades...');
    await pool.execute(`
      INSERT INTO activities (title, description, program_id, room_id, created_by, start_time, end_time, status, estimated_attendees) VALUES
      ('Inauguración Diplomado GP', 'Ceremonia de inauguración del Diplomado en Gestión de Proyectos', 1, 1, 1, '2026-04-14 09:00:00', '2026-04-14 12:00:00', 'scheduled', 80),
      ('Módulo 1: Fundamentos de Gestión', 'Introducción a la gestión de proyectos moderna', 1, 2, 2, '2026-04-15 09:00:00', '2026-04-15 13:00:00', 'scheduled', 35),
      ('Módulo 1: Taller Práctico', 'Ejercicios prácticos de planificación de proyectos', 1, 4, 2, '2026-04-15 14:00:00', '2026-04-15 18:00:00', 'scheduled', 28),
      ('Workshop: Introducción a IA', 'Primer acercamiento a conceptos de IA y Machine Learning', 2, 6, 3, '2026-04-16 09:00:00', '2026-04-16 13:00:00', 'scheduled', 60),
      ('MBA: Clase Inaugural', 'Presentación del programa y metodología del MBA', 3, 1, 1, '2026-04-17 18:00:00', '2026-04-17 21:00:00', 'scheduled', 100),
      ('Ciberseguridad: Módulo Básico', 'Introducción a amenazas y vulnerabilidades', 4, 4, 3, '2026-04-18 09:00:00', '2026-04-18 13:00:00', 'scheduled', 25),
      ('Data Science: Estadística Aplicada', 'Fundamentos estadísticos para ciencia de datos', 5, 2, 2, '2026-04-18 14:00:00', '2026-04-18 18:00:00', 'scheduled', 35),
      ('Diplomado GP: Metodologías Ágiles', 'Scrum, Kanban y marcos ágiles', 1, 3, 2, '2026-04-21 09:00:00', '2026-04-21 13:00:00', 'scheduled', 35),
      ('IA: Python para Data Science', 'Taller práctico de Python aplicado', 2, 4, 3, '2026-04-22 09:00:00', '2026-04-22 17:00:00', 'scheduled', 28),
      ('MBA: Liderazgo Organizacional', 'Teorías y prácticas de liderazgo', 3, 6, 1, '2026-04-23 18:00:00', '2026-04-23 21:00:00', 'scheduled', 70)
    `);

    // ASISTENTES
    console.log('🙋 Registrando asistentes...');
    await pool.execute(`
      INSERT INTO activity_attendees (activity_id, user_id, status) VALUES
      (1, 4, 'confirmed'), (1, 5, 'confirmed'), (1, 6, 'registered'),
      (1, 7, 'confirmed'), (1, 8, 'registered'),
      (2, 4, 'confirmed'), (2, 5, 'confirmed'), (2, 6, 'registered'),
      (3, 4, 'confirmed'), (3, 5, 'confirmed'),
      (4, 7, 'confirmed'), (4, 8, 'confirmed'), (4, 9, 'registered'),
      (5, 4, 'registered'), (5, 5, 'registered'), (5, 6, 'registered'),
      (5, 7, 'registered'), (5, 8, 'registered'), (5, 9, 'registered'), (5, 10, 'registered')
    `);

    // SERVICIOS EN ACTIVIDADES
    console.log('🍽️  Asignando servicios a actividades...');
    await pool.execute(`
      INSERT INTO activity_services (activity_id, service_id, quantity, notes) VALUES
      (1, 2, 80, 'Coffee break de inauguración - premium'),
      (1, 6, 80, 'Kit de bienvenida para todos los asistentes'),
      (2, 1, 35, 'Coffee break mañana'),
      (3, 1, 28, 'Coffee break tarde'),
      (4, 1, 60, 'Coffee break estándar'),
      (4, 3, 60, 'Almuerzo ejecutivo post-workshop'),
      (5, 2, 100, 'Coffee break premium inauguración MBA'),
      (5, 4, 100, 'Buffet de inauguración MBA'),
      (9, 1, 28, 'Coffee break día completo'),
      (9, 3, 28, 'Almuerzo ejecutivo')
    `);

    // HISTORIAL DE ASISTENCIA
    console.log('📊 Creando historial de asistencia...');
    await pool.execute(`
      INSERT INTO attendance_history (program_id, month, year, total_registered, total_attended, attendance_rate) VALUES
      (1, 1, 2026, 40, 34, 85.00), (1, 2, 2026, 38, 30, 78.95), (1, 3, 2026, 42, 36, 85.71),
      (2, 1, 2026, 55, 45, 81.82), (2, 2, 2026, 52, 40, 76.92), (2, 3, 2026, 58, 50, 86.21),
      (3, 1, 2026, 90, 78, 86.67), (3, 2, 2026, 88, 72, 81.82), (3, 3, 2026, 92, 80, 86.96),
      (5, 1, 2026, 35, 30, 85.71), (5, 2, 2026, 33, 26, 78.79), (5, 3, 2026, 36, 31, 86.11)
    `);

    // NOTIFICACIONES
    console.log('🔔 Creando notificaciones...');
    await pool.execute(`
      INSERT INTO notifications (user_id, title, message, type) VALUES
      (1, 'Bienvenido al Sistema', 'Has ingresado como Administrador General. Tienes acceso completo al sistema.', 'info'),
      (2, 'Nueva actividad asignada', 'Se te ha asignado como coordinadora del Módulo 1 de Gestión de Proyectos.', 'info'),
      (3, 'Nueva actividad asignada', 'Se te ha asignado como coordinador del Workshop de IA.', 'info'),
      (1, 'Conflicto detectado', 'Se ha detectado un posible conflicto de horarios en la Sala B-201 para el 18 de abril.', 'conflict'),
      (2, 'Recordatorio', 'La inauguración del Diplomado GP es mañana a las 09:00.', 'reminder')
    `);

    console.log('\n✅ Seed completado exitosamente!');
    console.log('');
    console.log('📋 Usuarios de prueba:');
    console.log('   Admin:       admin@academico.cl / admin123');
    console.log('   Coordinador: maria.gonzalez@academico.cl / coord123');
    console.log('   Usuario:     ana.rodriguez@academico.cl / user123');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seed();
