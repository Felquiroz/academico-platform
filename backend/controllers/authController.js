const jwt = require('jsonwebtoken');
const User = require('../models/User');
const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');

/**
 * Controlador de Autenticación
 */
const authController = {
  /**
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { name, email, password, role, phone } = req.body;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Nombre y email son obligatorios.' });
      }

      // Si no hay contraseña y es creación desde el frontend, usar contraseña por defecto
      const finalPassword = password || 'password123';

      // Verificar si el email ya existe
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'El email ya está registrado.' });
      }

      // Solo admins pueden crear otros admins o coordinadores
      let assignedRole = 'user';
      if (role && req.user && req.user.role === 'admin') {
        assignedRole = role;
      }

      const user = await User.create({ name, email, password: finalPassword, role: assignedRole, phone });

      await logAudit({
        userId: req.user?.id || user.id,
        action: 'CREATE',
        entityType: 'user',
        entityId: user.id,
        newValues: { name, email, role: assignedRole },
        ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Usuario registrado exitosamente.', data: user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/register-public
   * Registro público para estudiantes (sin autenticación)
   */
  async registerPublic(req, res, next) {
    try {
      const { name, email, password, phone } = req.body;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Nombre y email son obligatorios.' });
      }

      // Verificar si el email ya existe
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'El email ya está registrado.' });
      }

      // Verificar que el email sea del dominioacademico.cl
      if (!email.endsWith('@academico.cl')) {
        return res.status(400).json({ success: false, message: 'Debe usar un email @academico.cl' });
      }

      const finalPassword = password || 'password123';
      const user = await User.create({ name, email, password: finalPassword, role: 'user', phone });

      await logAudit({
        userId: user.id,
        action: 'SELF_REGISTER',
        entityType: 'user',
        entityId: user.id,
        newValues: { name, email, role: 'user' },
        ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Registro exitoso. Ya puedes iniciar sesión.', data: user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios.' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
      }

      if (!user.active) {
        return res.status(403).json({ success: false, message: 'Cuenta desactivada. Contacta al administrador.' });
      }

      const validPassword = await User.comparePassword(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
      }

      // Generar tokens
      const payload = { id: user.id, email: user.email, role: user.role };
      
      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn: process.env.JWT_EXPIRES_IN || '1h' 
      });

      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { 
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' 
      });

      // Guardar refresh token en BD
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
      await pool.execute(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, refreshToken, expiresAt]
      );

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso.',
        data: {
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token es obligatorio.' });
      }

      // Verificar que el token existe en la BD
      const [tokens] = await pool.execute(
        'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
        [refreshToken]
      );

      if (tokens.length === 0) {
        return res.status(401).json({ success: false, message: 'Refresh token inválido o expirado.' });
      }

      // Verificar JWT
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.active) {
        return res.status(401).json({ success: false, message: 'Usuario no encontrado o desactivado.' });
      }

      // Generar nuevo access token
      const payload = { id: user.id, email: user.email, role: user.role };
      const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn: process.env.JWT_EXPIRES_IN || '1h' 
      });

      res.json({
        success: true,
        data: { accessToken: newAccessToken }
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Token inválido.' });
      }
      next(error);
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await pool.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
      }
      res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   */
  async me(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
