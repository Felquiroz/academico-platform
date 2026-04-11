const pool = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  static async findAll({ role, active, search, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT id, name, email, role, active, phone, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active);
    }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, active, phone, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }

  static async create({ name, email, password, role = 'user', phone = null }) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, password_hash, role, phone]
    );
    return { id: result.insertId, name, email, role, phone };
  }

  static async update(id, { name, email, role, active, phone }) {
    const fields = [];
    const params = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (role !== undefined) { fields.push('role = ?'); params.push(role); }
    if (active !== undefined) { fields.push('active = ?'); params.push(active); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }

    if (fields.length === 0) return null;

    params.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
  }

  static async delete(id) {
    const [result] = await pool.execute('UPDATE users SET active = FALSE WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async comparePassword(plainPassword, hash) {
    return bcrypt.compare(plainPassword, hash);
  }

  static async count({ role, active } = {}) {
    let query = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    if (role) { query += ' AND role = ?'; params.push(role); }
    if (active !== undefined) { query += ' AND active = ?'; params.push(active); }
    const [rows] = await pool.execute(query, params.length > 0 ? params : []);
    return rows[0].total;
  }
}

module.exports = User;
