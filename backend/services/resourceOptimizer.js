const pool = require('../config/db');

/**
 * Servicio de Optimización de Recursos
 * 
 * Analiza el uso de salas y recursos para sugerir mejoras.
 */
class ResourceOptimizer {
  /**
   * Analizar uso de salas en un período
   */
  static async analyzeRoomUsage(startDate, endDate) {
    const [rooms] = await pool.execute(`
      SELECT 
        r.id, r.name, r.capacity, r.location,
        COUNT(a.id) as total_activities,
        COALESCE(SUM(TIMESTAMPDIFF(HOUR, a.start_time, a.end_time)), 0) as total_hours_used,
        COALESCE(AVG(a.estimated_attendees), 0) as avg_estimated,
        COALESCE(AVG(a.actual_attendees), 0) as avg_actual
      FROM rooms r
      LEFT JOIN activities a ON a.room_id = r.id 
        AND a.status != 'cancelled'
        AND a.start_time >= ? 
        AND a.end_time <= ?
      WHERE r.active = TRUE
      GROUP BY r.id
      ORDER BY total_hours_used DESC
    `, [startDate, endDate]);

    // Calcular horas disponibles en el período (asumiendo 12h/día, L-V)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const businessDays = this._countBusinessDays(start, end);
    const totalAvailableHours = businessDays * 12; // 8am-8pm

    return rooms.map(room => {
      const utilizationRate = totalAvailableHours > 0 
        ? (room.total_hours_used / totalAvailableHours) * 100 
        : 0;
      
      const avgOccupancy = room.avg_estimated > 0 
        ? (room.avg_estimated / room.capacity) * 100 
        : 0;

      return {
        ...room,
        total_available_hours: totalAvailableHours,
        utilization_rate: Math.round(utilizationRate * 100) / 100,
        avg_occupancy_rate: Math.round(avgOccupancy * 100) / 100,
        status: this._getUsageStatus(utilizationRate),
        recommendation: this._getRecommendation(utilizationRate, avgOccupancy)
      };
    });
  }

  /**
   * Obtener resumen general de optimización
   */
  static async getOptimizationSummary(startDate, endDate) {
    const roomUsage = await this.analyzeRoomUsage(startDate, endDate);
    
    const underused = roomUsage.filter(r => r.utilization_rate < 20);
    const overused = roomUsage.filter(r => r.utilization_rate > 80);
    const optimal = roomUsage.filter(r => r.utilization_rate >= 40 && r.utilization_rate <= 70);

    // Servicios más solicitados
    const [topServices] = await pool.execute(`
      SELECT s.name, COUNT(asv.id) as times_used, SUM(asv.quantity) as total_quantity,
        SUM(asv.quantity * s.cost_per_person) as total_cost
      FROM activity_services asv
      JOIN services s ON s.id = asv.service_id
      JOIN activities a ON a.id = asv.activity_id
      WHERE a.start_time >= ? AND a.end_time <= ?
      GROUP BY s.id
      ORDER BY times_used DESC
      LIMIT 5
    `, [startDate, endDate]);

    return {
      period: { start: startDate, end: endDate },
      rooms: {
        total: roomUsage.length,
        underused: underused.length,
        overused: overused.length,
        optimal: optimal.length,
        details: roomUsage
      },
      top_services: topServices,
      recommendations: this._generateGlobalRecommendations(roomUsage, underused, overused)
    };
  }

  static _countBusinessDays(start, end) {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  static _getUsageStatus(rate) {
    if (rate < 15) return '🔴 Subutilizada';
    if (rate < 35) return '🟡 Uso bajo';
    if (rate < 70) return '🟢 Uso óptimo';
    if (rate < 85) return '🟡 Uso alto';
    return '🔴 Sobreutilizada';
  }

  static _getRecommendation(utilizationRate, occupancyRate) {
    if (utilizationRate < 15) return 'Considerar desactivar o reasignar para otros usos';
    if (utilizationRate > 85) return 'Riesgo de saturación - distribuir actividades a otras salas';
    if (occupancyRate < 30) return 'Las actividades asignadas no aprovechan la capacidad - usar sala más pequeña';
    if (occupancyRate > 90) return 'Actividades con mucha concurrencia - considerar sala más grande';
    return 'Uso dentro de parámetros normales';
  }

  static _generateGlobalRecommendations(all, underused, overused) {
    const recs = [];
    if (underused.length > 0) {
      recs.push(`${underused.length} sala(s) subutilizada(s): ${underused.map(r => r.name).join(', ')}. Considerar reasignar actividades.`);
    }
    if (overused.length > 0) {
      recs.push(`${overused.length} sala(s) sobreutilizada(s): ${overused.map(r => r.name).join(', ')}. Redistribuir carga.`);
    }
    if (recs.length === 0) {
      recs.push('Todas las salas están dentro de parámetros óptimos de uso.');
    }
    return recs;
  }
}

module.exports = ResourceOptimizer;
