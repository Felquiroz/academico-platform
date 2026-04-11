const pool = require('../config/db');

class Activity {
  static async findAll({ program_id, room_id, status, start_date, end_date, search, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT a.*, 
        p.name as program_name, p.type as program_type,
        r.name as room_name, r.capacity as room_capacity,
        u.name as creator_name,
        (SELECT COUNT(*) FROM activity_attendees WHERE activity_id = a.id) as registered_count
      FROM activities a
      LEFT JOIN programs p ON p.id = a.program_id
      LEFT JOIN rooms r ON r.id = a.room_id
      LEFT JOIN users u ON u.id = a.created_by
      WHERE 1=1
    `;
    const params = [];

    if (program_id) { query += ' AND a.program_id = ?'; params.push(program_id); }
    if (room_id) { query += ' AND a.room_id = ?'; params.push(room_id); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    if (start_date) { query += ' AND a.start_time >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND a.end_time <= ?'; params.push(end_date); }
    if (search) { query += ' AND (a.title LIKE ? OR a.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY a.start_time ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(`
      SELECT a.*, 
        p.name as program_name, p.type as program_type,
        r.name as room_name, r.capacity as room_capacity, r.location as room_location,
        u.name as creator_name,
        (SELECT COUNT(*) FROM activity_attendees WHERE activity_id = a.id) as registered_count
      FROM activities a
      LEFT JOIN programs p ON p.id = a.program_id
      LEFT JOIN rooms r ON r.id = a.room_id
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async create({ title, description, program_id, room_id, created_by, start_time, end_time, estimated_attendees }) {
    const [result] = await pool.execute(
      `INSERT INTO activities (title, description, program_id, room_id, created_by, start_time, end_time, estimated_attendees) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, program_id, room_id || null, created_by, start_time, end_time, estimated_attendees || 0]
    );
    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const allowed = ['title', 'description', 'program_id', 'room_id', 'start_time', 'end_time', 'status', 'estimated_attendees', 'actual_attendees'];
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && allowed.includes(key)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (fields.length === 0) return null;

    params.push(id);
    await pool.execute(`UPDATE activities SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async delete(id) {
    await pool.execute("UPDATE activities SET status = 'cancelled' WHERE id = ?", [id]);
    return true;
  }
  static async count({ status, program_id } = {}) {
    let query = "SELECT COUNT(*) as total FROM activities WHERE status != 'cancelled'";
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (program_id) { query += ' AND program_id = ?'; params.push(program_id); }
    const [rows] = await pool.execute(query, params.length > 0 ? params : []);
    return rows[0].total;
  }

  /**
   * Obtener actividades próximas
   */
  static async getUpcoming(limit = 5) {
    const [rows] = await pool.query(`
      SELECT a.*, 
        p.name as program_name,
        r.name as room_name,
        (SELECT COUNT(*) FROM activity_attendees WHERE activity_id = a.id) as registered_count
      FROM activities a
      LEFT JOIN programs p ON p.id = a.program_id
      LEFT JOIN rooms r ON r.id = a.room_id
      WHERE a.start_time > NOW() AND a.status = 'scheduled'
      ORDER BY a.start_time ASC
      LIMIT ?
    `, [Number(limit)]);
    return rows;
  }

  /**
   * Obtener actividades para el calendario (rango de fechas)
   */
  static async getForCalendar(startDate, endDate) {
    const [rows] = await pool.query(`
      SELECT a.id, a.title, a.start_time, a.end_time, a.status,
        p.name as program_name, p.type as program_type,
        r.name as room_name,
        (SELECT COUNT(*) FROM activity_attendees WHERE activity_id = a.id) as registered_count
      FROM activities a
      LEFT JOIN programs p ON p.id = a.program_id
      LEFT JOIN rooms r ON r.id = a.room_id
      WHERE a.start_time >= ? AND a.end_time <= ?
        AND a.status != 'cancelled'
      ORDER BY a.start_time ASC
    `, [startDate, endDate]);
    return rows;
  }

  /**
   * Buscar conflictos de horario para una sala
   */
  static async findConflicts(roomId, startTime, endTime, excludeId = null) {
    let query = `
      SELECT * FROM activities 
      WHERE room_id = ? 
        AND status != 'cancelled'
        AND start_time < ? 
        AND end_time > ?
    `;
    const params = [roomId, endTime, startTime];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

module.exports = Activity;
