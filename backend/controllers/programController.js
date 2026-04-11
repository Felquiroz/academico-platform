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
      const { name, description, type, start_date, end_date } = req.body;

      if (!name || !type || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Nombre, tipo, fecha inicio y fin son obligatorios.' });
      }

      if (!['diplomado', 'magister'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Tipo debe ser "diplomado" o "magister".' });
      }

      const program = await Program.create({ name, description, type, start_date, end_date });

      await logAudit({
        userId: req.user.id, action: 'CREATE', entityType: 'program',
        entityId: program.id, newValues: program, ipAddress: req.ip
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
