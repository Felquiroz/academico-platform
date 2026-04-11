const pool = require('../config/db');

/**
 * Servicio de Estimación de Asistencia
 * 
 * Utiliza datos históricos para predecir la asistencia real
 * a una actividad basándose en:
 * - Tasa histórica de asistencia del programa
 * - Día de la semana (lunes y viernes tienden a tener menor asistencia)
 * - Hora del día (mañana vs tarde vs noche)
 */
class AttendanceEstimator {
  /**
   * Estimar asistencia real para una actividad
   * @param {number} programId - ID del programa
   * @param {number} registeredCount - Cantidad de inscritos
   * @param {string} startTime - Fecha/hora de inicio
   * @returns {Object} Estimación con detalles
   */
  static async estimate(programId, registeredCount, startTime) {
    // 1. Obtener tasa histórica del programa
    const historicalRate = await this.getHistoricalRate(programId);

    // 2. Calcular factor por día de la semana
    const dayFactor = this.getDayFactor(new Date(startTime));

    // 3. Calcular factor por hora
    const hourFactor = this.getHourFactor(new Date(startTime));

    // 4. Calcular estimación
    const baseRate = historicalRate || 82; // 82% si no hay datos históricos
    const adjustedRate = baseRate * dayFactor * hourFactor;
    const estimatedAttendance = Math.round(registeredCount * (adjustedRate / 100));

    return {
      registered_count: registeredCount,
      historical_rate: Math.round(historicalRate * 100) / 100,
      day_factor: dayFactor,
      hour_factor: hourFactor,
      adjusted_rate: Math.round(adjustedRate * 100) / 100,
      estimated_attendance: estimatedAttendance,
      confidence: this.getConfidenceLevel(historicalRate, registeredCount),
      details: {
        day_of_week: this.getDayName(new Date(startTime).getDay()),
        time_slot: this.getTimeSlot(new Date(startTime).getHours()),
        message: this._buildMessage(estimatedAttendance, registeredCount, adjustedRate)
      }
    };
  }

  /**
   * Obtener tasa promedio de asistencia histórica para un programa
   */
  static async getHistoricalRate(programId) {
    const [rows] = await pool.execute(`
      SELECT AVG(attendance_rate) as avg_rate
      FROM attendance_history
      WHERE program_id = ?
      ORDER BY year DESC, month DESC
      LIMIT 6
    `, [programId]);

    return rows[0]?.avg_rate || null;
  }

  /**
   * Factor de ajuste por día de la semana
   * Lunes y viernes tienen menor asistencia
   */
  static getDayFactor(date) {
    const day = date.getDay();
    const factors = {
      0: 0.75,  // Domingo
      1: 0.92,  // Lunes
      2: 1.00,  // Martes (referencia)
      3: 1.00,  // Miércoles
      4: 0.98,  // Jueves
      5: 0.88,  // Viernes
      6: 0.80   // Sábado
    };
    return factors[day] || 1.0;
  }

  /**
   * Factor de ajuste por hora del día
   */
  static getHourFactor(date) {
    const hour = date.getHours();
    if (hour >= 9 && hour < 12) return 1.0;    // Mañana: ideal
    if (hour >= 12 && hour < 14) return 0.95;   // Mediodía: leve baja
    if (hour >= 14 && hour < 17) return 0.97;   // Tarde: buena
    if (hour >= 17 && hour < 20) return 0.93;   // Tarde-noche: algo menor
    if (hour >= 20) return 0.88;                 // Noche: menor
    return 0.90;                                 // Muy temprano
  }

  static getDayName(day) {
    const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return names[day];
  }

  static getTimeSlot(hour) {
    if (hour >= 9 && hour < 12) return 'Mañana';
    if (hour >= 12 && hour < 14) return 'Mediodía';
    if (hour >= 14 && hour < 18) return 'Tarde';
    if (hour >= 18) return 'Noche';
    return 'Muy temprano';
  }

  static getConfidenceLevel(historicalRate, registeredCount) {
    if (!historicalRate) return { level: 'baja', message: 'Sin datos históricos suficientes' };
    if (registeredCount < 5) return { level: 'baja', message: 'Pocos inscritos para una estimación fiable' };
    if (registeredCount >= 20) return { level: 'alta', message: 'Estimación basada en datos sólidos' };
    return { level: 'media', message: 'Estimación con datos moderados' };
  }

  static _buildMessage(estimated, registered, rate) {
    const percentage = Math.round(rate);
    return `Se estima que asistirán ${estimated} de ${registered} inscritos (tasa ajustada: ${percentage}%).`;
  }
}

module.exports = AttendanceEstimator;
