const pool = require('../config/db');
const Notification = require('../models/Notification');

/**
 * Servicio de Detección de Conflictos de Horario
 * 
 * Detecta automáticamente solapamientos de:
 * - Sala: dos actividades usan la misma sala al mismo tiempo
 * - Asistente: un asistente está registrado en dos actividades simultáneas
 */
class ConflictDetector {
  /**
   * Detectar todos los conflictos para una actividad
   */
  static async detectForActivity(activityId, roomId, startTime, endTime) {
    const conflicts = [];

    // 1. Conflictos de sala
    if (roomId) {
      const roomConflicts = await this.detectRoomConflicts(roomId, startTime, endTime, activityId);
      conflicts.push(...roomConflicts);
    }

    // 2. Conflictos de asistentes
    const attendeeConflicts = await this.detectAttendeeConflicts(activityId, startTime, endTime);
    conflicts.push(...attendeeConflicts);

    // Registrar conflictos en la base de datos
    for (const conflict of conflicts) {
      await this.registerConflict(conflict);
    }

    return conflicts;
  }

  /**
   * Detectar conflictos de sala
   */
  static async detectRoomConflicts(roomId, startTime, endTime, excludeActivityId = null) {
    let query = `
      SELECT a.id, a.title, a.start_time, a.end_time, r.name as room_name
      FROM activities a
      JOIN rooms r ON r.id = a.room_id
      WHERE a.room_id = ?
        AND a.status != 'cancelled'
        AND a.start_time < ?
        AND a.end_time > ?
    `;
    const params = [roomId, endTime, startTime];

    if (excludeActivityId) {
      query += ' AND a.id != ?';
      params.push(excludeActivityId);
    }

    const [rows] = await pool.execute(query, params);

    return rows.map(conflict => ({
      activity_id_1: excludeActivityId,
      activity_id_2: conflict.id,
      type: 'room',
      description: `Conflicto de sala: "${conflict.title}" ya tiene reservada la sala ${conflict.room_name} de ${conflict.start_time} a ${conflict.end_time}`,
      conflicting_activity: conflict
    }));
  }

  /**
   * Detectar conflictos de asistentes (personas en 2 actividades a la vez)
   */
  static async detectAttendeeConflicts(activityId, startTime, endTime) {
    const [rows] = await pool.execute(`
      SELECT DISTINCT 
        aa1.user_id, u.name as user_name, u.email,
        a2.id as conflict_activity_id, a2.title as conflict_title,
        a2.start_time as conflict_start, a2.end_time as conflict_end
      FROM activity_attendees aa1
      JOIN activity_attendees aa2 ON aa1.user_id = aa2.user_id AND aa2.activity_id != ?
      JOIN activities a2 ON a2.id = aa2.activity_id
      JOIN users u ON u.id = aa1.user_id
      WHERE aa1.activity_id = ?
        AND a2.status != 'cancelled'
        AND a2.start_time < ?
        AND a2.end_time > ?
    `, [activityId, activityId, endTime, startTime]);

    return rows.map(conflict => ({
      activity_id_1: activityId,
      activity_id_2: conflict.conflict_activity_id,
      type: 'attendee',
      description: `Conflicto de asistente: ${conflict.user_name} (${conflict.email}) también está registrado/a en "${conflict.conflict_title}" (${conflict.conflict_start} - ${conflict.conflict_end})`,
      user_id: conflict.user_id,
      user_name: conflict.user_name
    }));
  }

  /**
   * Registrar un conflicto en la BD y notificar
   */
  static async registerConflict(conflict) {
    try {
      // Verificar que no exista ya este conflicto
      const [existing] = await pool.execute(`
        SELECT id FROM schedule_conflicts 
        WHERE activity_id_1 = ? AND activity_id_2 = ? AND type = ? AND resolved = FALSE
      `, [conflict.activity_id_1, conflict.activity_id_2, conflict.type]);

      if (existing.length > 0) return existing[0].id;

      const [result] = await pool.execute(
        'INSERT INTO schedule_conflicts (activity_id_1, activity_id_2, type, description) VALUES (?, ?, ?, ?)',
        [conflict.activity_id_1, conflict.activity_id_2, conflict.type, conflict.description]
      );

      // Notificar a administradores y coordinadores
      const [admins] = await pool.execute(
        "SELECT id FROM users WHERE role IN ('admin', 'coordinator') AND active = TRUE",
        []
      );

      if (admins.length > 0) {
        await Notification.createBulk(
          admins.map(a => a.id),
          {
            title: '⚠️ Conflicto de horario detectado',
            message: conflict.description,
            type: 'conflict'
          }
        );
      }

      return result.insertId;
    } catch (error) {
      console.error('Error registrando conflicto:', error.message);
    }
  }

  /**
   * Obtener conflictos activos (no resueltos)
   */
  static async getActiveConflicts() {
    const [rows] = await pool.execute(`
      SELECT sc.*,
        a1.title as activity_1_title, a1.start_time as activity_1_start,
        a2.title as activity_2_title, a2.start_time as activity_2_start
      FROM schedule_conflicts sc
      JOIN activities a1 ON a1.id = sc.activity_id_1
      JOIN activities a2 ON a2.id = sc.activity_id_2
      WHERE sc.resolved = FALSE
      ORDER BY sc.created_at DESC
    `, []);
    return rows;
  }

  /**
   * Marcar conflicto como resuelto
   */
  static async resolveConflict(conflictId) {
    await pool.execute('UPDATE schedule_conflicts SET resolved = TRUE WHERE id = ?', [conflictId]);
  }

  /**
   * Contar conflictos activos
   */
  static async countActive() {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM schedule_conflicts WHERE resolved = FALSE',
      []
    );
    return rows[0].count;
  }
}

module.exports = ConflictDetector;
