const pool = require('../config/db');

class Request {
  static async create({ type, title, description, requested_by, teacher_id, program_id, room_id, start_time, end_time, activity_id, service_ids }) {
    const servicesJson = service_ids ? JSON.stringify(service_ids) : null;
    const params = [
      type, title, description, requested_by, teacher_id || null,
      program_id || null, room_id || null,
      start_time || null, end_time || null,
      activity_id || null, servicesJson, 'pending'
    ];
    const [result] = await pool.execute(
      `INSERT INTO requests (type, title, description, requested_by, teacher_id, program_id, room_id, start_time, end_time, activity_id, service_ids, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.execute(`
      SELECT r.*, u.name as user_name, u.email as user_email,
        t.id as teacher_id, t.name as teacher_name, t.email as teacher_email,
        p.name as program_name, rom.name as room_name, a.title as activity_title
      FROM requests r
      LEFT JOIN users u ON u.id = r.requested_by
      LEFT JOIN users t ON t.id = r.teacher_id
      LEFT JOIN programs p ON p.id = r.program_id
      LEFT JOIN rooms rom ON rom.id = r.room_id
      LEFT JOIN activities a ON a.id = r.activity_id
      WHERE r.id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async findAll({ status, type, requested_by, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT r.*, u.name as user_name, u.email as user_email,
        t.id as teacher_id, t.name as teacher_name, t.email as teacher_email,
        p.name as program_name, rom.name as room_name, a.title as activity_title
      FROM requests r
      LEFT JOIN users u ON u.id = r.requested_by
      LEFT JOIN users t ON t.id = r.teacher_id
      LEFT JOIN programs p ON p.id = r.program_id
      LEFT JOIN rooms rom ON rom.id = r.room_id
      LEFT JOIN activities a ON a.id = r.activity_id
      WHERE 1=1
    `;
    const params = [];

    if (status) { query += ' AND r.status = ?'; params.push(status); }
    if (type) { query += ' AND r.type = ?'; params.push(type); }
    if (requested_by) { query += ' AND r.requested_by = ?'; params.push(requested_by); }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async updateStatus(id, status, reviewed_by, notes = null) {
    await pool.execute(
      'UPDATE requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), notes = ? WHERE id = ?',
      [status, reviewed_by, notes, id]
    );
    return this.findById(id);
  }

  static async count({ status } = {}) {
    let query = 'SELECT COUNT(*) as total FROM requests WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    const [rows] = await pool.execute(query, params.length > 0 ? params : []);
    return rows[0].total;
  }

  static async checkAvailability(room_id, start_time, end_time, exclude_request_id = null) {
    let query = `
      SELECT a.id, a.title, a.start_time, a.end_time
      FROM activities a
      WHERE a.room_id = ? AND a.status != 'cancelled'
      AND a.start_time < ? AND a.end_time > ?
    `;
    const params = [room_id, end_time, start_time];

    if (exclude_request_id) {
      query += ' AND a.id != ?';
      params.push(exclude_request_id);
    }

    const [activities] = await pool.execute(query, params);

    // Also check pending requests
    const [requests] = await pool.execute(`
      SELECT id, title, start_time, end_time FROM requests
      WHERE room_id = ? AND status = 'pending' AND type = 'room'
      AND start_time < ? AND end_time > ?
      ${exclude_request_id ? 'AND id != ?' : ''}
    `, exclude_request_id 
      ? [room_id, end_time, start_time, exclude_request_id]
      : [room_id, end_time, start_time]
    );

    return { conflicts: activities.length + requests.length > 0, activities, requests };
  }
  static async getAvailableTeachers() {
    // Traemos id, name y email de los usuarios cuyo rol sea 'coordinator'
    const [rows] = await pool.execute(
      "SELECT id, name, email FROM users WHERE role = 'coordinator' ORDER BY name ASC"
    );
    return rows;
  }
}

module.exports = Request;