const Room = require('../models/Room');
const RoomSuggestion = require('../services/roomSuggestion');
const { logAudit } = require('../middleware/audit');

const roomController = {
  async getAll(req, res, next) {
    try {
      const { active, minCapacity, search, limit, offset } = req.query;
      const rooms = await Room.findAll({
        active: active !== undefined ? active === 'true' : undefined,
        minCapacity: parseInt(minCapacity) || undefined,
        search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      res.json({ success: true, data: rooms });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) return res.status(404).json({ success: false, message: 'Sala no encontrada.' });
      res.json({ success: true, data: room });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { name, capacity, location, equipment } = req.body;
      if (!name || !capacity) {
        return res.status(400).json({ success: false, message: 'Nombre y capacidad son obligatorios.' });
      }

      const room = await Room.create({ name, capacity, location, equipment });

      await logAudit({
        userId: req.user.id, action: 'CREATE', entityType: 'room',
        entityId: room.id, newValues: room, ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Sala creada.', data: room });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const old = await Room.findById(req.params.id);
      if (!old) return res.status(404).json({ success: false, message: 'Sala no encontrada.' });

      const updated = await Room.update(req.params.id, req.body);

      await logAudit({
        userId: req.user.id, action: 'UPDATE', entityType: 'room',
        entityId: parseInt(req.params.id), oldValues: old, newValues: updated, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Sala actualizada.', data: updated });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) return res.status(404).json({ success: false, message: 'Sala no encontrada.' });

      await Room.delete(req.params.id);

      await logAudit({
        userId: req.user.id, action: 'DELETE', entityType: 'room',
        entityId: parseInt(req.params.id), oldValues: room, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Sala desactivada.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/rooms/check-availability
   * Query: room_id, start_time, end_time
   */
  async checkAvailability(req, res, next) {
    try {
      const { room_id, start_time, end_time, exclude_activity_id } = req.query;
      if (!room_id || !start_time || !end_time) {
        return res.status(400).json({ success: false, message: 'room_id, start_time y end_time son obligatorios.' });
      }
      const result = await Room.checkAvailability(room_id, start_time, end_time, exclude_activity_id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/rooms/suggest
   * Query: attendees, start_time, end_time
   */
  async suggest(req, res, next) {
    try {
      const { attendees, start_time, end_time } = req.query;
      if (!attendees || !start_time || !end_time) {
        return res.status(400).json({ success: false, message: 'attendees, start_time y end_time son obligatorios.' });
      }
      const result = await RoomSuggestion.suggest(parseInt(attendees), start_time, end_time);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/rooms/:id/usage
   * Query: start_date, end_date
   */
  async getUsage(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const stats = await Room.getUsageStats(req.params.id, start_date, end_date);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = roomController;
