const pool = require('../config/db');

class Program {
  static async findAll({ type, active, search, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM programs WHERE 1=1';
    const params = [];

    if (type) { query += ' AND type = ?'; params.push(type); }
    if (active !== undefined) { query += ' AND active = ?'; params.push(active); }
    if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY start_date DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM programs WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async create({ name, description, type, start_date, end_date }) {
    const [result] = await pool.execute(
      'INSERT INTO programs (name, description, type, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, type, start_date, end_date]
    );
    return { id: result.insertId, name, description, type, start_date, end_date };
  }

  static async update(id, data) {
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && ['name', 'description', 'type', 'start_date', 'end_date', 'active'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (fields.length === 0) return null;

    params.push(id);
    await pool.execute(`UPDATE programs SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await pool.execute('UPDATE programs SET active = FALSE WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async count({ type, active } = {}) {
    let query = 'SELECT COUNT(*) as total FROM programs WHERE 1=1';
    const params = [];
    if (type) { query += ' AND type = ?'; params.push(type); }
    if (active !== undefined) { query += ' AND active = ?'; params.push(active); }
    const [rows] = await pool.execute(query, params.length > 0 ? params : []);
    return rows[0].total;
  }

  static async getStats(id) {
    const [rows] = await pool.execute(`
      SELECT 
        p.*,
        COUNT(DISTINCT a.id) as total_activities,
        COUNT(DISTINCT aa.user_id) as total_students,
        AVG(ah.attendance_rate) as avg_attendance
      FROM programs p
      LEFT JOIN activities a ON a.program_id = p.id
      LEFT JOIN activity_attendees aa ON aa.activity_id = a.id
      LEFT JOIN attendance_history ah ON ah.program_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [id]);
    return rows[0] || null;
  }
}

module.exports = Program;
