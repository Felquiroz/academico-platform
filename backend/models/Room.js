const pool = require('../config/db');

class Room {
  static async findAll({ active, minCapacity, search, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (active !== undefined) { query += ' AND active = ?'; params.push(active); }
    if (minCapacity) { query += ' AND capacity >= ?'; params.push(minCapacity); }
    if (search) { query += ' AND (name LIKE ? OR location LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY capacity ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows.map(r => ({
      ...r,
      equipment: typeof r.equipment === 'string' ? JSON.parse(r.equipment) : r.equipment
    }));
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const room = rows[0];
    room.equipment = typeof room.equipment === 'string' ? JSON.parse(room.equipment) : room.equipment;
    return room;
  }

  static async create({ name, capacity, location, equipment }) {
    const [result] = await pool.execute(
      'INSERT INTO rooms (name, capacity, location, equipment) VALUES (?, ?, ?, ?)',
      [name, capacity, location || null, equipment ? JSON.stringify(equipment) : null]
    );
    return { id: result.insertId, name, capacity, location, equipment };
  }

  static async update(id, data) {
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && ['name', 'capacity', 'location', 'active'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }
    if (data.equipment !== undefined) {
      fields.push('equipment = ?');
      params.push(JSON.stringify(data.equipment));
    }

    if (fields.length === 0) return null;

    params.push(id);
    await pool.execute(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await pool.execute('UPDATE rooms SET active = FALSE WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Verificar disponibilidad de una sala en un rango de tiempo
   */
  static async checkAvailability(roomId, startTime, endTime, excludeActivityId = null) {
    let query = `
      SELECT a.id, a.title, a.start_time, a.end_time 
      FROM activities a 
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
    return {
      available: rows.length === 0,
      conflicts: rows
    };
  }

  /**
   * Obtener salas disponibles en un rango de tiempo
   */
  static async findAvailable(startTime, endTime, minCapacity = 0) {
    const [rows] = await pool.query(`
      SELECT r.* FROM rooms r
      WHERE r.active = TRUE
        AND r.capacity >= ?
        AND r.id NOT IN (
          SELECT a.room_id FROM activities a
          WHERE a.room_id IS NOT NULL
            AND a.status != 'cancelled'
            AND a.start_time < ?
            AND a.end_time > ?
        )
      ORDER BY r.capacity ASC
    `, [minCapacity, endTime, startTime]);

    return rows.map(r => ({
      ...r,
      equipment: typeof r.equipment === 'string' ? JSON.parse(r.equipment) : r.equipment
    }));
  }

  /**
   * Obtener estadísticas de uso de una sala
   */
  static async getUsageStats(roomId, startDate, endDate) {
    const [rows] = await pool.execute(`
      SELECT 
        COUNT(*) as total_activities,
        SUM(TIMESTAMPDIFF(HOUR, start_time, end_time)) as total_hours,
        AVG(actual_attendees) as avg_attendees,
        r.capacity
      FROM activities a
      JOIN rooms r ON r.id = a.room_id
      WHERE a.room_id = ?
        AND a.status != 'cancelled'
        AND a.start_time >= ?
        AND a.end_time <= ?
    `, [roomId, startDate, endDate]);
    return rows[0];
  }
}

module.exports = Room;
