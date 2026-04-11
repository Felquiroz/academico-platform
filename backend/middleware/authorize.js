/**
 * Middleware de autorización por roles
 * Se usa después del middleware de autenticación
 * 
 * Uso: authorize('admin', 'coordinator')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}.` 
      });
    }

    next();
  };
};

module.exports = authorize;
