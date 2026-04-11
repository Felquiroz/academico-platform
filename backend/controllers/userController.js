const User = require('../models/User');
const { logAudit } = require('../middleware/audit');

const userController = {
  /**
   * GET /api/users
   */
  async getAll(req, res, next) {
    try {
      const { role, active, search, limit, offset } = req.query;
      const users = await User.findAll({
        role,
        active: active !== undefined ? active === 'true' : undefined,
        search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      const total = await User.count({ role, active: active !== undefined ? active === 'true' : undefined });
      res.json({ success: true, data: users, pagination: { total, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/users/:id
   */
  async getById(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/users/:id
   */
  async update(req, res, next) {
    try {
      const oldUser = await User.findById(req.params.id);
      if (!oldUser) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

      const { name, email, role, active, phone } = req.body;
      const updated = await User.update(req.params.id, { name, email, role, active, phone });

      await logAudit({
        userId: req.user.id,
        action: 'UPDATE',
        entityType: 'user',
        entityId: parseInt(req.params.id),
        oldValues: oldUser,
        newValues: updated,
        ipAddress: req.ip
      });

      res.json({ success: true, message: 'Usuario actualizado.', data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/users/:id/password
   */
  async updatePassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
      }
      await User.updatePassword(req.params.id, newPassword);
      res.json({ success: true, message: 'Contraseña actualizada.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/users/:id (soft delete)
   */
  async delete(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

      await User.delete(req.params.id);

      await logAudit({
        userId: req.user.id,
        action: 'DELETE',
        entityType: 'user',
        entityId: parseInt(req.params.id),
        oldValues: user,
        ipAddress: req.ip
      });

      res.json({ success: true, message: 'Usuario desactivado.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;
