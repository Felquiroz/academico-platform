const pool = require('../config/db');

class AuditLog {
  static async findAll({ user_id, entity_type, entity_id, start_date, end_date, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) { query += ' AND al.user_id = ?'; params.push(user_id); }
    if (entity_type) { query += ' AND al.entity_type = ?'; params.push(entity_type); }
    if (entity_id) { query += ' AND al.entity_id = ?'; params.push(entity_id); }
    if (start_date) { query += ' AND al.created_at >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND al.created_at <= ?'; params.push(end_date); }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows.map(r => ({
      ...r,
      old_values: r.old_values ? (typeof r.old_values === 'string' ? JSON.parse(r.old_values) : r.old_values) : null,
      new_values: r.new_values ? (typeof r.new_values === 'string' ? JSON.parse(r.new_values) : r.new_values) : null
    }));
  }

  static async count({ entity_type } = {}) {
    let query = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const params = [];
    if (entity_type) { query += ' AND entity_type = ?'; params.push(entity_type); }
    const [rows] = await pool.execute(query, params.length > 0 ? params : []);
    return rows[0].total;
  }
}

module.exports = AuditLog;
