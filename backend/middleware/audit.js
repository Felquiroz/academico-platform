const pool = require('../config/db');

/**
 * Función para registrar auditoría de cambios
 * Se llama desde los controladores después de una operación exitosa
 */
const logAudit = async ({ userId, action, entityType, entityId, oldValues = null, newValues = null, ipAddress = null }) => {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress
      ]
    );
  } catch (error) {
    // No lanzamos error para no interrumpir la operación principal
    console.error('Error registrando auditoría:', error.message);
  }
};

module.exports = { logAudit };
