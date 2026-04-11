const Room = require('../models/Room');

/**
 * Servicio de Sugerencia Inteligente de Salas
 * 
 * Analiza la cantidad de asistentes estimados y la disponibilidad
 * para recomendar la mejor sala posible.
 */
class RoomSuggestion {
  /**
   * Sugerir las mejores salas para una actividad
   * @param {number} estimatedAttendees - Cantidad estimada de asistentes
   * @param {string} startTime - Fecha/hora inicio
   * @param {string} endTime - Fecha/hora fin
   * @param {number|null} excludeActivityId - Excluir una actividad (para edición)
   * @returns {Array} Top 3 salas sugeridas con score
   */
  static async suggest(estimatedAttendees, startTime, endTime, excludeActivityId = null) {
    // Obtener todas las salas disponibles en ese horario
    const availableRooms = await Room.findAvailable(startTime, endTime, 0);

    if (availableRooms.length === 0) {
      return {
        suggestions: [],
        message: 'No hay salas disponibles en el horario seleccionado.'
      };
    }

    // Calcular score para cada sala
    const scored = availableRooms
      .filter(room => room.capacity >= estimatedAttendees)
      .map(room => {
        const occupancyRate = (estimatedAttendees / room.capacity) * 100;
        
        // Score: penalizamos salas muy grandes (desperdicio) y muy justas (incómodo)
        // Ideal: 60-85% de ocupación
        let score = 100;
        
        if (occupancyRate > 90) {
          // Muy llena - riesgo de que no quepan todos
          score -= (occupancyRate - 90) * 2;
        } else if (occupancyRate < 40) {
          // Muy vacía - desperdicio de espacio
          score -= (40 - occupancyRate) * 1.5;
        } else if (occupancyRate >= 60 && occupancyRate <= 85) {
          // Rango ideal - bonus
          score += 10;
        }

        // Bonus por tener buen equipamiento
        const equipmentCount = room.equipment ? room.equipment.length : 0;
        score += Math.min(equipmentCount * 2, 10);

        return {
          room_id: room.id,
          room_name: room.name,
          capacity: room.capacity,
          location: room.location,
          equipment: room.equipment,
          occupancy_rate: Math.round(occupancyRate * 100) / 100,
          score: Math.round(Math.max(score, 0) * 100) / 100,
          recommendation: this._getRecommendation(occupancyRate)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Si no hay salas que quepan, sugerir las más grandes disponibles
    if (scored.length === 0) {
      const largest = availableRooms
        .sort((a, b) => b.capacity - a.capacity)
        .slice(0, 3)
        .map(room => ({
          room_id: room.id,
          room_name: room.name,
          capacity: room.capacity,
          location: room.location,
          equipment: room.equipment,
          occupancy_rate: (estimatedAttendees / room.capacity) * 100,
          score: 0,
          recommendation: 'Capacidad insuficiente - se recomienda reducir asistentes o buscar otra fecha'
        }));

      return {
        suggestions: largest,
        message: `No hay salas con capacidad para ${estimatedAttendees} personas en ese horario. Las salas más grandes disponibles son:`
      };
    }

    return {
      suggestions: scored,
      message: `Se encontraron ${scored.length} salas recomendadas para ${estimatedAttendees} asistentes.`
    };
  }

  static _getRecommendation(occupancyRate) {
    if (occupancyRate >= 60 && occupancyRate <= 85) return '✅ Óptima - Capacidad ideal';
    if (occupancyRate > 85 && occupancyRate <= 95) return '⚠️ Ajustada - Funcional pero con poco margen';
    if (occupancyRate > 95) return '🔴 Muy ajustada - Riesgo de sobrecupo';
    if (occupancyRate >= 40 && occupancyRate < 60) return '🟡 Aceptable - Sala algo grande para el grupo';
    return '🔵 Holgada - Mucho espacio libre, considerar sala menor';
  }
}

module.exports = RoomSuggestion;
