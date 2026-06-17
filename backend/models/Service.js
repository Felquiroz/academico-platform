const pool = require('../config/db');

class Service {
  static async findAll({ active, search } = {}) {
    let query = 'SELECT * FROM services WHERE 1=1';
    const params = [];

    if (active !== undefined) { query += ' AND active = ?'; params.push(active); }
    if (search) { query += ' AND (name LIKE ? OR provider LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY name ASC';
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM services WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async create({ name, description, cost_per_person, provider }) {
    const [result] = await pool.execute(
      'INSERT INTO services (name, description, cost_per_person, provider) VALUES (?, ?, ?, ?)',
      [name, description || null, cost_per_person, provider || null]
    );
    return { id: result.insertId, name, description, cost_per_person, provider };
  }

  static async update(id, data) {
    const allowed = ['name', 'description', 'cost_per_person', 'provider', 'active'];
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
    await pool.execute(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await pool.execute('UPDATE services SET active = FALSE WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- Servicios asignados a actividades ---

  static async assignToActivity(activityId, serviceId, quantity, notes = null) {
    const [result] = await pool.execute(
      'INSERT INTO activity_services (activity_id, service_id, quantity, notes) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = ?, notes = ?',
      [activityId, serviceId, quantity, notes, quantity, notes]
    );
    return result;
  }

  static async removeFromActivity(activityId, serviceId) {
    const [result] = await pool.execute(
      'DELETE FROM activity_services WHERE activity_id = ? AND service_id = ?',
      [activityId, serviceId]
    );
    return result.affectedRows > 0;
  }

  static async getByActivity(activityId) {
    const [rows] = await pool.execute(`
      SELECT asv.*, s.name, s.description, s.cost_per_person, s.provider,
        (asv.quantity * s.cost_per_person) as total_cost
      FROM activity_services asv
      JOIN services s ON s.id = asv.service_id
      WHERE asv.activity_id = ?
    `, [activityId]);
    return rows;
  }

  /**
   * Costo total de servicios para una actividad
   */
  static async getTotalCost(activityId) {
    const [rows] = await pool.execute(`
      SELECT COALESCE(SUM(asv.quantity * s.cost_per_person), 0) as total
      FROM activity_services asv
      JOIN services s ON s.id = asv.service_id
      WHERE asv.activity_id = ?
    `, [activityId]);
    return rows[0].total;
  }

  // --- Menú Options ---

  static async getMenuOptions(serviceId) {
    const [rows] = await pool.execute(
      'SELECT * FROM service_menu_options WHERE service_id = ? ORDER BY option_name',
      [serviceId]
    );
    return rows;
  }

  static async addMenuOption(serviceId, optionName) {
    const [result] = await pool.execute(
      'INSERT INTO service_menu_options (service_id, option_name) VALUES (?, ?)',
      [serviceId, optionName]
    );
    return { id: result.insertId, service_id: serviceId, option_name: optionName };
  }

  static async removeMenuOption(optionId) {
    const [result] = await pool.execute('DELETE FROM service_menu_options WHERE id = ?', [optionId]);
    return result.affectedRows > 0;
  }

  // --- Student Menu Choices ---

  static async saveMenuChoice(activityId, userId, serviceId, menuOptionId, customNotes = null) {
    await pool.execute(
      `INSERT INTO menu_choices (activity_id, user_id, service_id, menu_option_id, custom_notes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE menu_option_id = VALUES(menu_option_id), custom_notes = VALUES(custom_notes)`,
      [activityId, userId, serviceId, menuOptionId || null, customNotes]
    );
    return true;
  }

  static async getMenuChoicesForUser(activityId, userId) {
    const [rows] = await pool.execute(`
      SELECT mc.*, smo.option_name, s.name as service_name
      FROM menu_choices mc
      JOIN activity_services av ON av.activity_id = mc.activity_id AND av.service_id = mc.service_id
      JOIN services s ON s.id = mc.service_id
      LEFT JOIN service_menu_options smo ON smo.id = mc.menu_option_id
      WHERE mc.activity_id = ? AND mc.user_id = ?
    `, [activityId, userId]);
    return rows;
  }

  static async getMenuChoicesForActivity(activityId) {
    const [rows] = await pool.execute(`
      SELECT mc.*, u.name as user_name, u.email as user_email,
        smo.option_name, s.name as service_name
      FROM menu_choices mc
      JOIN users u ON u.id = mc.user_id
      JOIN services s ON s.id = mc.service_id
      LEFT JOIN service_menu_options smo ON smo.id = mc.menu_option_id
      WHERE mc.activity_id = ?
      ORDER BY s.name, u.name
    `, [activityId]);
    return rows;
  }
}

module.exports = Service;
