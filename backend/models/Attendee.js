const pool = require('../config/db');

class Attendee {
  /**
   * Obtener asistentes de una actividad
   */
  static async findByActivity(activityId) {
    const [rows] = await pool.execute(`
      SELECT aa.*, u.name, u.email, u.phone
      FROM activity_attendees aa
      JOIN users u ON u.id = aa.user_id
      WHERE aa.activity_id = ?
      ORDER BY u.name ASC
    `, [activityId]);
    return rows;
  }

  /**
   * Obtener actividades de un usuario
   */
  static async findByUser(userId) {
    const [rows] = await pool.execute(`
      SELECT aa.*, a.title, a.start_time, a.end_time, a.status as activity_status,
        r.name as room_name
      FROM activity_attendees aa
      JOIN activities a ON a.id = aa.activity_id
      LEFT JOIN rooms r ON r.id = a.room_id
      WHERE aa.user_id = ?
      ORDER BY a.start_time ASC
    `, [userId]);
    return rows;
  }

  /**
   * Registrar un asistente a una actividad
   */
  static async register(activityId, userId) {
    const [result] = await pool.execute(
      'INSERT INTO activity_attendees (activity_id, user_id, status) VALUES (?, ?, ?)',
      [activityId, userId, 'registered']
    );
    return { id: result.insertId, activity_id: activityId, user_id: userId, status: 'registered' };
  }

  /**
   * Registro masivo de asistentes
   */
  static async registerBulk(activityId, userIds) {
    const values = userIds.map(uid => [activityId, uid, 'registered']);
    const placeholders = values.map(() => '(?, ?, ?)').join(', ');
    const flat = values.flat();

    const [result] = await pool.execute(
      `INSERT IGNORE INTO activity_attendees (activity_id, user_id, status) VALUES ${placeholders}`,
      flat
    );
    return { inserted: result.affectedRows };
  }

  /**
   * Actualizar estado de un asistente
   */
  static async updateStatus(activityId, userId, status) {
    const [result] = await pool.execute(
      'UPDATE activity_attendees SET status = ? WHERE activity_id = ? AND user_id = ?',
      [status, activityId, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Eliminar registro de asistente
   */
  static async remove(activityId, userId) {
    const [result] = await pool.execute(
      'DELETE FROM activity_attendees WHERE activity_id = ? AND user_id = ?',
      [activityId, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Verificar si el usuario tiene conflicto de horario
   */
  static async checkUserConflict(userId, startTime, endTime, excludeActivityId = null) {
    let query = `
      SELECT a.id, a.title, a.start_time, a.end_time
      FROM activity_attendees aa
      JOIN activities a ON a.id = aa.activity_id
      WHERE aa.user_id = ?
        AND a.status != 'cancelled'
        AND a.start_time < ?
        AND a.end_time > ?
    `;
    const params = [userId, endTime, startTime];

    if (excludeActivityId) {
      query += ' AND a.id != ?';
      params.push(excludeActivityId);
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Contar por estado en una actividad
   */
  static async countByStatus(activityId) {
    const [rows] = await pool.execute(`
      SELECT status, COUNT(*) as count
      FROM activity_attendees
      WHERE activity_id = ?
      GROUP BY status
    `, [activityId]);
    
    const result = { registered: 0, confirmed: 0, attended: 0, absent: 0, total: 0 };
    rows.forEach(r => {
      result[r.status] = r.count;
      result.total += r.count;
    });
    return result;
  }
}

module.exports = Attendee;
