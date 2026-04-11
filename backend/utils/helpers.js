/**
 * Funciones utilitarias compartidas
 */

/**
 * Formatear fecha para MySQL
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Validar email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Sanitizar string para prevenir XSS básico
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '');
}

/**
 * Paginar resultados
 */
function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { limit: l, offset: (p - 1) * l };
}

module.exports = { formatDate, isValidEmail, sanitize, paginate };
