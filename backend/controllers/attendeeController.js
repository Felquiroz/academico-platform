const Attendee = require('../models/Attendee');
const { logAudit } = require('../middleware/audit');

const attendeeController = {
  /**
   * GET /api/activities/:activityId/attendees
   */
  async getByActivity(req, res, next) {
    try {
      const attendees = await Attendee.findByActivity(req.params.activityId);
      const stats = await Attendee.countByStatus(req.params.activityId);
      res.json({ success: true, data: attendees, stats });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/users/:userId/activities
   */
  async getByUser(req, res, next) {
    try {
      const activities = await Attendee.findByUser(req.params.userId);
      res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/activities/:activityId/attendees
   * Body: { user_id } o { user_ids: [...] }
   */
  async register(req, res, next) {
    try {
      const activityId = parseInt(req.params.activityId);
      const { user_id, user_ids } = req.body;

      if (user_ids && Array.isArray(user_ids)) {
        // Registro masivo
        const result = await Attendee.registerBulk(activityId, user_ids);

        await logAudit({
          userId: req.user.id, action: 'BULK_REGISTER', entityType: 'attendee',
          entityId: activityId, newValues: { user_ids, count: result.inserted }, ipAddress: req.ip
        });

        return res.status(201).json({ success: true, message: `${result.inserted} asistentes registrados.`, data: result });
      }

      if (!user_id) {
        return res.status(400).json({ success: false, message: 'user_id es obligatorio.' });
      }

      // Verificar conflictos de horario del asistente
      const pool = require('../config/db');
      const [activity] = await pool.execute('SELECT start_time, end_time FROM activities WHERE id = ?', [activityId]);
      if (activity.length > 0) {
        const conflicts = await Attendee.checkUserConflict(user_id, activity[0].start_time, activity[0].end_time, activityId);
        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'El asistente tiene conflicto de horario.',
            conflicts: conflicts.map(c => ({ title: c.title, start: c.start_time, end: c.end_time }))
          });
        }
      }

      const attendee = await Attendee.register(activityId, user_id);

      await logAudit({
        userId: req.user.id, action: 'REGISTER', entityType: 'attendee',
        entityId: activityId, newValues: { user_id }, ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Asistente registrado.', data: attendee });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/activities/:activityId/attendees/:userId
   * Body: { status: 'confirmed' | 'attended' | 'absent' }
   */
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const validStatuses = ['registered', 'confirmed', 'attended', 'absent'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Estado inválido. Opciones: ${validStatuses.join(', ')}` });
      }

      const updated = await Attendee.updateStatus(req.params.activityId, req.params.userId, status);
      if (!updated) return res.status(404).json({ success: false, message: 'Registro no encontrado.' });

      res.json({ success: true, message: `Estado actualizado a "${status}".` });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/activities/:activityId/attendees/:userId
   */
  async remove(req, res, next) {
    try {
      const removed = await Attendee.remove(req.params.activityId, req.params.userId);
      if (!removed) return res.status(404).json({ success: false, message: 'Registro no encontrado.' });

      await logAudit({
        userId: req.user.id, action: 'REMOVE', entityType: 'attendee',
        entityId: parseInt(req.params.activityId),
        oldValues: { user_id: req.params.userId }, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Asistente eliminado de la actividad.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = attendeeController;
