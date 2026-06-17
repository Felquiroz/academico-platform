const Service = require('../models/Service');
const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');

const serviceController = {
  async getAll(req, res, next) {
    try {
      const { active, search } = req.query;
      const services = await Service.findAll({
        active: active !== undefined ? active === 'true' : undefined,
        search
      });
      res.json({ success: true, data: services });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const service = await Service.findById(req.params.id);
      if (!service) return res.status(404).json({ success: false, message: 'Servicio no encontrado.' });
      res.json({ success: true, data: service });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { name, description, cost_per_person, provider } = req.body;
      if (!name || cost_per_person === undefined) {
        return res.status(400).json({ success: false, message: 'Nombre y costo por persona son obligatorios.' });
      }

      const service = await Service.create({ name, description, cost_per_person, provider });

      await logAudit({
        userId: req.user.id, action: 'CREATE', entityType: 'service',
        entityId: service.id, newValues: service, ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Servicio creado.', data: service });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const old = await Service.findById(req.params.id);
      if (!old) return res.status(404).json({ success: false, message: 'Servicio no encontrado.' });

      const updated = await Service.update(req.params.id, req.body);

      await logAudit({
        userId: req.user.id, action: 'UPDATE', entityType: 'service',
        entityId: parseInt(req.params.id), oldValues: old, newValues: updated, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Servicio actualizado.', data: updated });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await Service.delete(req.params.id);
      res.json({ success: true, message: 'Servicio desactivado.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/activities/:activityId/services
   * Body: { service_id, quantity, notes }
   */
  async assignToActivity(req, res, next) {
    try {
      const { service_id, quantity, notes } = req.body;
      if (!service_id || !quantity) {
        return res.status(400).json({ success: false, message: 'service_id y quantity son obligatorios.' });
      }

      await Service.assignToActivity(req.params.activityId, service_id, quantity, notes);

      await logAudit({
        userId: req.user.id, action: 'ASSIGN_SERVICE', entityType: 'activity_service',
        entityId: parseInt(req.params.activityId),
        newValues: { service_id, quantity, notes }, ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Servicio asignado a la actividad.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/activities/:activityId/services
   */
  async getByActivity(req, res, next) {
    try {
      const services = await Service.getByActivity(req.params.activityId);
      const totalCost = await Service.getTotalCost(req.params.activityId);
      res.json({ success: true, data: services, total_cost: totalCost });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/activities/:activityId/services/:serviceId
   */
  async removeFromActivity(req, res, next) {
    try {
      await Service.removeFromActivity(req.params.activityId, req.params.serviceId);
      res.json({ success: true, message: 'Servicio eliminado de la actividad.' });
    } catch (error) {
      next(error);
    }
  },

  // --- Menu Options ---

  async getMenuOptions(req, res, next) {
    try {
      const options = await Service.getMenuOptions(req.params.id);
      res.json({ success: true, data: options });
    } catch (error) {
      next(error);
    }
  },

  async addMenuOption(req, res, next) {
    try {
      const { option_name } = req.body;
      if (!option_name) return res.status(400).json({ success: false, message: 'option_name es obligatorio.' });
      const option = await Service.addMenuOption(req.params.id, option_name);
      res.status(201).json({ success: true, data: option });
    } catch (error) {
      next(error);
    }
  },

  async removeMenuOption(req, res, next) {
    try {
      await Service.removeMenuOption(req.params.optionId);
      res.json({ success: true, message: 'Opción eliminada.' });
    } catch (error) {
      next(error);
    }
  },

  // --- Student Menu Choices ---

  async saveMenuChoice(req, res, next) {
    try {
      const { activity_id, service_id, menu_option_id, custom_notes } = req.body;
      if (!activity_id || !service_id) {
        return res.status(400).json({ success: false, message: 'activity_id y service_id son obligatorios.' });
      }
      await Service.saveMenuChoice(activity_id, req.user.id, service_id, menu_option_id, custom_notes);
      res.json({ success: true, message: 'Preferencia guardada.' });
    } catch (error) {
      next(error);
    }
  },

  async getMyMenuChoices(req, res, next) {
    try {
      const { activity_id } = req.query;
      if (!activity_id) return res.status(400).json({ success: false, message: 'activity_id es obligatorio.' });
      const choices = await Service.getMenuChoicesForUser(activity_id, req.user.id);
      res.json({ success: true, data: choices });
    } catch (error) {
      next(error);
    }
  },

  async getActivityMenuChoices(req, res, next) {
    try {
      const choices = await Service.getMenuChoicesForActivity(req.params.activityId);
      res.json({ success: true, data: choices });
    } catch (error) {
      next(error);
    }
  },

  async exportMenus(req, res, next) {
    try {
      const { activity_id } = req.query;
      let query = `
        SELECT mc.*, u.name as user_name, u.email as user_email,
          smo.option_name, s.name as service_name, a.title as activity_title,
          a.start_time, a.end_time, p.name as program_name
        FROM menu_choices mc
        JOIN users u ON u.id = mc.user_id
        JOIN services s ON s.id = mc.service_id
        JOIN activities a ON a.id = mc.activity_id
        LEFT JOIN service_menu_options smo ON smo.id = mc.menu_option_id
        LEFT JOIN programs p ON p.id = a.program_id
        WHERE 1=1
      `;
      const params = [];
      if (activity_id) { query += ' AND mc.activity_id = ?'; params.push(activity_id); }
      query += ' ORDER BY a.start_time ASC, s.name, u.name';

      const [rows] = await pool.query(query, params);

      const format = req.query.format || 'json';
      if (format === 'csv') {
        const headers = ['Actividad', 'Programa', 'Fecha', 'Alumno', 'Email', 'Servicio', 'Opción', 'Notas'];
        const csvRows = [headers.join(',')];
        rows.forEach(r => {
          csvRows.push([
            `"${r.activity_title}"`,
            r.program_name,
            r.start_time,
            `"${r.user_name}"`,
            r.user_email,
            `"${r.service_name}"`,
            r.option_name || 'Sin elegir',
            (r.custom_notes || '').replace(/,/g, ';')
          ].join(','));
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=menus.csv');
        return res.send(csvRows.join('\n'));
      }

      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = serviceController;
