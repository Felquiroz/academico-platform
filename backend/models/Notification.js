const pool = require('../config/db');

class Notification {
  static async findByUser(userId, { unreadOnly = false, limit = 20, offset = 0 } = {}) {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];

    if (unreadOnly) {
      query += ' AND `read` = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async create({ user_id, title, message, type = 'info' }) {
    const [result] = await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [user_id, title, message, type]
    );
    return { id: result.insertId, user_id, title, message, type, read: false };
  }

  /**
   * Crear notificación para múltiples usuarios
   */
  static async createBulk(userIds, { title, message, type = 'info' }) {
    if (userIds.length === 0) return;
    const values = userIds.map(uid => [uid, title, message, type]);
    const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ${placeholders}`,
      values.flat()
    );
  }

  static async markAsRead(id, userId) {
    await pool.execute(
      'UPDATE notifications SET `read` = TRUE WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  static async markAllAsRead(userId) {
    await pool.execute(
      'UPDATE notifications SET `read` = TRUE WHERE user_id = ? AND `read` = FALSE',
      [userId]
    );
  }

  static async countUnread(userId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND `read` = FALSE',
      [userId]
    );
    return rows[0].count;
  }

  static async delete(id, userId) {
    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Notification;
