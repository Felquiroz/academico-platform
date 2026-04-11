const Notification = require('../models/Notification');

const notificationController = {
  /**
   * GET /api/notifications
   */
  async getAll(req, res, next) {
    try {
      const { unread, limit, offset } = req.query;
      const notifications = await Notification.findByUser(req.user.id, {
        unreadOnly: unread === 'true',
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      });
      const unreadCount = await Notification.countUnread(req.user.id);
      res.json({ success: true, data: notifications, unread_count: unreadCount });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      await Notification.markAsRead(req.params.id, req.user.id);
      res.json({ success: true, message: 'Notificación marcada como leída.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      await Notification.markAllAsRead(req.user.id);
      res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/notifications/count
   */
  async getUnreadCount(req, res, next) {
    try {
      const count = await Notification.countUnread(req.user.id);
      res.json({ success: true, data: { unread_count: count } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/notifications/:id
   */
  async delete(req, res, next) {
    try {
      await Notification.delete(req.params.id, req.user.id);
      res.json({ success: true, message: 'Notificación eliminada.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = notificationController;
