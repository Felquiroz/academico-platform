const Program = require('../models/Program');
const { logAudit } = require('../middleware/audit');

const programController = {
  async getAll(req, res, next) {
    try {
      const { type, active, search, limit, offset } = req.query;
      const programs = await Program.findAll({
        type,
        active: active !== undefined ? active === 'true' : undefined,
        search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      const total = await Program.count({ type, active: active !== undefined ? active === 'true' : undefined });
      res.json({ success: true, data: programs, pagination: { total } });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const program = await Program.findById(req.params.id);
      if (!program) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });
      res.json({ success: true, data: program });
    } catch (error) {
      next(error);
    }
  },

  async getStats(req, res, next) {
    try {
      const stats = await Program.getStats(req.params.id);
      if (!stats) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { name, description, type, start_date, end_date, user_ids } = req.body;

      if (!name || !type || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Nombre, tipo, fecha inicio y fin son obligatorios.' });
      }

      if (!['diplomado', 'magister'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Tipo debe ser "diplomado" o "magister".' });
      }

      const program = await Program.create({ name, description, type, start_date, end_date });

      if (user_ids && user_ids.length > 0) {
        await Program.enrollUsers(program.id, user_ids);
      }

      await logAudit({
        userId: req.user.id, action: 'CREATE', entityType: 'program',
        entityId: program.id, newValues: { ...program, user_ids }, ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Programa creado.', data: program });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const old = await Program.findById(req.params.id);
      if (!old) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });

      const updated = await Program.update(req.params.id, req.body);

      await logAudit({
        userId: req.user.id, action: 'UPDATE', entityType: 'program',
        entityId: parseInt(req.params.id), oldValues: old, newValues: updated, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Programa actualizado.', data: updated });
    } catch (error) {
      next(error);
    }
  },

  async getEnrollments(req, res, next) {
    try {
      const program = await Program.findById(req.params.id);
      if (!program) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });
      const users = await Program.getEnrolledUsers(req.params.id);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },

  async enrollUsers(req, res, next) {
    try {
      const program = await Program.findById(req.params.id);
      if (!program) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });
      const { user_ids } = req.body;
      if (!user_ids || !Array.isArray(user_ids)) {
        return res.status(400).json({ success: false, message: 'user_ids es requerido.' });
      }
      const users = await Program.enrollUsers(req.params.id, user_ids);
      await logAudit({
        userId: req.user.id, action: 'BULK_REGISTER', entityType: 'program_enrollment',
        entityId: parseInt(req.params.id), newValues: { user_ids }, ipAddress: req.ip
      });
      res.json({ success: true, message: `${user_ids.length} usuarios inscritos al programa.`, data: users });
    } catch (error) {
      next(error);
    }
  },

  async removeEnrolledUser(req, res, next) {
    try {
      await Program.removeEnrolledUser(req.params.id, req.params.userId);
      await logAudit({
        userId: req.user.id, action: 'DELETE', entityType: 'program_enrollment',
        entityId: parseInt(req.params.id), oldValues: { user_id: parseInt(req.params.userId) }, ipAddress: req.ip
      });
      res.json({ success: true, message: 'Usuario eliminado del programa.' });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const program = await Program.findById(req.params.id);
      if (!program) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });

      await Program.delete(req.params.id);

      await logAudit({
        userId: req.user.id, action: 'DELETE', entityType: 'program',
        entityId: parseInt(req.params.id), oldValues: program, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Programa desactivado.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = programController;
