const Service = require('../models/Service');
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
  }
};

module.exports = serviceController;
