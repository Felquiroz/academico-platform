/**
 * Middleware global de manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // Errores de MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'El registro ya existe. Hay un valor duplicado.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida. El registro relacionado no existe.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Error general de base de datos
  if (err.sql || err.code?.startsWith('ER_')) {
    console.error(`❌ DB Error [${err.code}]: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error en la base de datos.',
      error: process.env.NODE_ENV === 'development' ? { message: err.message, code: err.code, sql: err.sql } : undefined
    });
  }

  // Error genérico
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
