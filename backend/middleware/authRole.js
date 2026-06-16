// middleware/authRole.js
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // req.user viene del middleware de autenticación previo
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado: No tienes permisos para esta sección.' 
      });
    }
    next();
  };
};

module.exports = checkRole;