const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación JWT
 * Verifica que el request tenga un token válido en el header Authorization
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Acceso denegado. Token no proporcionado.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado. Por favor inicia sesión nuevamente.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido.' 
    });
  }
};

module.exports = authenticate;
