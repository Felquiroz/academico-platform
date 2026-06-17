const Activity = require('../models/Activity');
const ConflictDetector = require('../services/conflictDetector');
const AttendanceEstimator = require('../services/attendanceEstimator');
const RoomSuggestion = require('../services/roomSuggestion');
const { logAudit } = require('../middleware/audit');
const Notification = require('../models/Notification');
const pool = require('../config/db');

const activityController = {
  /**
   * PUT /api/activities/update-status
   * Actualiza automáticamente el estado de actividades según el horario
   */
  async updateStatusAuto(req, res, next) {
    try {
      const now = new Date();
      
      // Actividades que deberían estar "en curso"
      await pool.execute(`
        UPDATE activities 
        SET status = 'in_progress' 
        WHERE status = 'scheduled' 
        AND start_time <= ? 
        AND end_time > ?
      `, [now, now]);

      // Actividades que deberían estar "completadas"
      await pool.execute(`
        UPDATE activities 
        SET status = 'completed' 
        WHERE status = 'in_progress' 
        AND end_time <= ?
      `, [now]);

      res.json({ success: true, message: 'Estados actualizados automáticamente.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/activities/export?format=csv|json&...
   */
  async export(req, res, next) {
    try {
      const { format = 'json', program_id, start_date, end_date, status } = req.query;
      
      let query = `
        SELECT a.*, p.name as program_name, p.type as program_type,
          r.name as room_name, r.capacity as room_capacity,
          u.name as creator_name,
          (SELECT COUNT(*) FROM activity_attendees WHERE activity_id = a.id) as registered_count
        FROM activities a
        LEFT JOIN programs p ON p.id = a.program_id
        LEFT JOIN rooms r ON r.id = a.room_id
        LEFT JOIN users u ON u.id = a.created_by
        WHERE 1=1
      `;
      const params = [];

      if (program_id) { query += ' AND a.program_id = ?'; params.push(program_id); }
      if (status) { query += ' AND a.status = ?'; params.push(status); }
      if (start_date) { query += ' AND a.start_time >= ?'; params.push(start_date); }
      if (end_date) { query += ' AND a.end_time <= ?'; params.push(end_date); }

      query += ' ORDER BY a.start_time DESC';

      const [rows] = await pool.query(query, params);

      if (format === 'csv') {
        const headers = ['ID', 'Título', 'Programa', 'Sala', 'Fecha Inicio', 'Fecha Fin', 'Estado', 'Asistentes', 'Estimados'];
        const csvRows = [headers.join(',')];
        rows.forEach(row => {
          csvRows.push([
            row.id,
            `"${row.title}"`,
            row.program_name,
            row.room_name || '',
            row.start_time,
            row.end_time,
            row.status,
            row.registered_count,
            row.estimated_attendees
          ].join(','));
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=actividades.csv');
        return res.send(csvRows.join('\n'));
      }

      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/activities/export-semanal
   */
  async exportSemanal(req, res, next) {
    try {
      const { program_id, week_start } = req.query;
      let startDate, endDate;

      if (week_start) {
        const ws = new Date(week_start);
        startDate = ws.toISOString();
        endDate = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        startDate = monday.toISOString();
        endDate = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      let query = `
        SELECT a.*, p.name as program_name, p.type as program_type,
          r.name as room_name, u.name as creator_name
        FROM activities a
        LEFT JOIN programs p ON p.id = a.program_id
        LEFT JOIN rooms r ON r.id = a.room_id
        LEFT JOIN users u ON u.id = a.created_by
        WHERE a.start_time >= ? AND a.end_time < ?
          AND a.status != 'cancelled'
      `;
      const params = [startDate, endDate];

      if (program_id) { query += ' AND a.program_id = ?'; params.push(program_id); }

      query += ' ORDER BY a.start_time ASC';

      const [rows] = await pool.query(query, params);

      // Agrupar por día
      const grouped = {};
      rows.forEach(row => {
        const day = new Date(row.start_time).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(row);
      });

      res.json({ success: true, data: grouped, total: rows.length, week: { start: startDate, end: endDate } });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const { program_id, room_id, status, start_date, end_date, search, limit, offset } = req.query;
      const activities = await Activity.findAll({
        program_id: parseInt(program_id) || undefined,
        room_id: parseInt(room_id) || undefined,
        status, start_date, end_date, search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      const total = await Activity.count({ status, program_id: parseInt(program_id) || undefined });
      res.json({ success: true, data: activities, pagination: { total } });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const activity = await Activity.findById(req.params.id);
      if (!activity) return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });
      res.json({ success: true, data: activity });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { title, description, program_id, room_id, start_time, end_time, estimated_attendees } = req.body;

      if (!title || !program_id || !start_time || !end_time) {
        return res.status(400).json({ success: false, message: 'Título, programa, fecha inicio y fin son obligatorios.' });
      }

      // Validar que la fecha de inicio sea antes de la fecha de fin
      if (new Date(start_time) >= new Date(end_time)) {
        return res.status(400).json({ success: false, message: 'La fecha de inicio debe ser anterior a la fecha de fin.' });
      }

      // Bloquear si hay conflicto de sala
      if (room_id) {
        const roomConflicts = await Activity.findConflicts(room_id, start_time, end_time);
        if (roomConflicts.length > 0) {
          const conflict = roomConflicts[0];
          return res.status(409).json({
            success: false,
            message: `La sala ya está ocupada. Conflicto con "${conflict.title}" (${new Date(conflict.start_time).toLocaleString()} - ${new Date(conflict.end_time).toLocaleString()})`
          });
        }
      }

      const activity = await Activity.create({
        title, description, program_id, room_id,
        created_by: req.user.id, start_time, end_time, estimated_attendees
      });

      // Auto-inscribir a los alumnos del programa en esta actividad
      const [enrolledUsers] = await pool.execute(
        'SELECT user_id FROM program_enrollments WHERE program_id = ?',
        [program_id]
      );
      if (enrolledUsers.length > 0) {
        const values = enrolledUsers.map(e => `(${activity.id}, ${e.user_id}, 'registered', NOW())`).join(',');
        await pool.execute(
          `INSERT IGNORE INTO activity_attendees (activity_id, user_id, status, registered_at) VALUES ${values}`
        );
      }

      // Detectar y registrar conflictos
      if (room_id) {
        await ConflictDetector.detectForActivity(activity.id, room_id, start_time, end_time);
      }

      // Estimar asistencia
      let estimation = null;
      if (estimated_attendees) {
        estimation = await AttendanceEstimator.estimate(program_id, estimated_attendees, start_time);
      }

      // Sugerir sala si no se asignó una
      let roomSuggestions = null;
      if (!room_id && estimated_attendees) {
        roomSuggestions = await RoomSuggestion.suggest(estimated_attendees, start_time, end_time);
      }

      await logAudit({
        userId: req.user.id, action: 'CREATE', entityType: 'activity',
        entityId: activity.id, newValues: activity, ipAddress: req.ip
      });

      // Obtener información del programa y sala para la notificación
      const [programResult] = await pool.execute('SELECT name FROM programs WHERE id = ?', [program_id]);
      const programName = programResult[0]?.name || 'Programa';
      const roomInfo = activity.room_id ? ` en sala ${activity.room_name || '#' + activity.room_id}` : '';
      const dateInfo = new Date(start_time).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

      // Notificar a todos los usuarios activos sobre la nueva actividad
      const [users] = await pool.execute('SELECT id FROM users WHERE active = TRUE');
      const userIds = users.map(u => u.id);
      
      if (userIds.length > 0) {
        await Notification.createBulk(userIds, {
          title: '📅 Nueva actividad programada',
          message: `${title} - ${programName}${roomInfo}. ${dateInfo}`,
          type: 'info'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Actividad creada.',
        data: activity,
        estimation,
        room_suggestions: roomSuggestions
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const old = await Activity.findById(req.params.id);
      if (!old) return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });

      const updated = await Activity.update(req.params.id, req.body);

      // Re-detectar conflictos si cambiaron sala u horario
      if (req.body.room_id || req.body.start_time || req.body.end_time) {
        const roomId = req.body.room_id || updated.room_id;
        const startTime = req.body.start_time || updated.start_time;
        const endTime = req.body.end_time || updated.end_time;
        await ConflictDetector.detectForActivity(updated.id, roomId, startTime, endTime);
      }

      await logAudit({
        userId: req.user.id, action: 'UPDATE', entityType: 'activity',
        entityId: parseInt(req.params.id), oldValues: old, newValues: updated, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Actividad actualizada.', data: updated });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const activity = await Activity.findById(req.params.id);
      if (!activity) return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });

      await Activity.delete(req.params.id);

      await logAudit({
        userId: req.user.id, action: 'DELETE', entityType: 'activity',
        entityId: parseInt(req.params.id), oldValues: activity, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Actividad cancelada.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/activities/upcoming
   */
  async getUpcoming(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const activities = await Activity.getUpcoming(limit);
      res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/activities/calendar?start=...&end=...
   */
  async getCalendar(req, res, next) {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ success: false, message: 'start y end son obligatorios.' });
      }
      const role = req.user.role;
      const userId = req.user.id;

      // Admin ve todo, teacher/coordinator ve sus actividades, student ve actividades de sus programas
      let filterUserIds = null;
      if (role === 'student') {
        const [enrollments] = await pool.execute(
          'SELECT DISTINCT program_id FROM program_enrollments WHERE user_id = ?',
          [userId]
        );
        filterUserIds = enrollments.map(e => e.program_id);
      }

      const activities = await Activity.getForCalendar(start, end, role, userId, filterUserIds);
      res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/activities/:id/estimate
   */
  async getEstimation(req, res, next) {
    try {
      const activity = await Activity.findById(req.params.id);
      if (!activity) return res.status(404).json({ success: false, message: 'Actividad no encontrada.' });

      const estimation = await AttendanceEstimator.estimate(
        activity.program_id,
        activity.registered_count || activity.estimated_attendees,
        activity.start_time
      );
      res.json({ success: true, data: estimation });
    } catch (error) {
      next(error);
    }
  },


  /**
   * GET /api/activities/my-activities
   * Obtiene las actividades basándose en las inscripciones del alumno
   */
  async getMyActivities(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Para coordinadores/profesores: mostrar actividades que crearon
      if (userRole === 'coordinator' || userRole === 'teacher' || userRole === 'admin') {
        const [rows] = await pool.query(`
          SELECT a.*, p.name as program_name, p.type as program_type,
            r.name as room_name, r.capacity as room_capacity,
            'registered' as attendance_status
          FROM activities a
          LEFT JOIN programs p ON p.id = a.program_id
          LEFT JOIN rooms r ON r.id = a.room_id
          WHERE a.created_by = ? AND a.status != 'cancelled'
          ORDER BY a.start_time ASC
        `, [userId]);
        return res.json({ success: true, data: rows, type: 'enrolled' });
      }
      
      // Primero verificar si tiene inscripciones en programas
      const [programEnrollments] = await pool.execute(
        'SELECT program_id FROM program_enrollments WHERE user_id = ?',
        [userId]
      );

      // También verificar inscripciones directas a actividades
      const [activityEnrollments] = await pool.execute(
        'SELECT DISTINCT program_id FROM activity_attendees aa JOIN activities a ON a.id = aa.activity_id WHERE aa.user_id = ?',
        [userId]
      );

      const programIds = [
        ...programEnrollments.map(e => e.program_id),
        ...activityEnrollments.map(e => e.program_id)
      ];

      if (programIds.length > 0) {
        const uniqueIds = [...new Set(programIds)];
        const [rows] = await pool.query(`
          SELECT a.*, p.name as program_name, p.type as program_type,
            r.name as room_name, r.capacity as room_capacity,
            COALESCE(aa.status, 'available') as attendance_status
          FROM activities a
          LEFT JOIN programs p ON p.id = a.program_id
          LEFT JOIN rooms r ON r.id = a.room_id
          LEFT JOIN activity_attendees aa ON aa.activity_id = a.id AND aa.user_id = ?
          WHERE a.program_id IN (?) AND a.status != 'cancelled'
          ORDER BY a.start_time ASC
        `, [userId, uniqueIds]);
        return res.json({ success: true, data: rows, type: 'enrolled' });
      }

      res.json({ success: true, data: [], type: 'none' });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * GET /api/activities/my-activities/with-services
   * Obtiene actividades del estudiante con servicios asignados
   */
  async getMyActivitiesWithServices(req, res, next) {
    try {
      const userId = req.user.id;
      const [rows] = await pool.query(`
        SELECT a.*, p.name as program_name, p.type as program_type,
          r.name as room_name, r.capacity as room_capacity,
          COALESCE(aa.status, 'registered') as attendance_status,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('service_id', av.service_id, 'service_name', s.name, 'quantity', av.quantity))
           FROM activity_services av JOIN services s ON s.id = av.service_id WHERE av.activity_id = a.id
          ) as _services
        FROM activities a
        LEFT JOIN programs p ON p.id = a.program_id
        LEFT JOIN rooms r ON r.id = a.room_id
        LEFT JOIN activity_attendees aa ON aa.activity_id = a.id AND aa.user_id = ?
        WHERE a.id IN (
          SELECT activity_id FROM activity_services
        )
        AND a.program_id IN (
          SELECT program_id FROM program_enrollments WHERE user_id = ?
        )
        AND a.status = 'scheduled'
        AND a.start_time > NOW()
        ORDER BY a.start_time ASC
      `, [userId, userId]);
      rows.forEach(r => {
        if (typeof r._services === 'string') {
          try { r._services = JSON.parse(r._services); } catch { r._services = []; }
        }
        if (!r._services) r._services = [];
      });
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/activities/my-programs
   * Obtiene los programas en los que está inscrito el alumno
   */
  async getMyPrograms(req, res, next) {
    try {
      const userId = req.user.id;

      // Programas donde el usuario está inscrito (desde program_enrollments o activity_attendees)
      const [enrolled] = await pool.query(`
        SELECT p.*, 'enrolled' as enrollment_status
        FROM programs p
        LEFT JOIN program_enrollments pe ON pe.program_id = p.id AND pe.user_id = ?
        LEFT JOIN activity_attendees aa ON aa.activity_id IN (SELECT id FROM activities WHERE program_id = p.id) AND aa.user_id = ?
        WHERE (pe.id IS NOT NULL OR aa.id IS NOT NULL) AND p.active = TRUE
        ORDER BY p.start_date DESC
      `, [userId, userId]);

      res.json({ success: true, data: { enrolled, available: [] } });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * POST /api/activities/:activityId/confirm-attendance
   */
  async confirmAttendance(req, res, next) {
    try {
      const activityId = req.params.activityId;
      const userId = req.user.id;
      const { modalidad } = req.body;

      if (!modalidad) {
        return res.status(400).json({ success: false, message: 'La modalidad de asistencia es obligatoria.' });
      }

      // 1. Verificamos si ya existe un registro de este usuario para esta actividad
      const [existing] = await pool.execute(
        'SELECT * FROM activity_attendees WHERE activity_id = ? AND user_id = ?',
        [activityId, userId]
      );

      if (existing.length > 0) {
        // Si existe, lo actualizamos
        await pool.execute(
          'UPDATE activity_attendees SET status = ?, modality = ? WHERE activity_id = ? AND user_id = ?',
          ['confirmed', modalidad, activityId, userId]
        );
      } else {
        // Si no existe, lo creamos
        await pool.execute(
          'INSERT INTO activity_attendees (activity_id, user_id, status, modality) VALUES (?, ?, ?, ?)',
          [activityId, userId, 'confirmed', modalidad]
        );
      }

      res.json({ success: true, message: `Asistencia ${modalidad} confirmada.` });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * POST /api/activities/:activityId/enroll
   * Inscribir al usuario en una actividad disponible
   */
  async enrollActivity(req, res, next) {
    try {
      const activityId = req.params.activityId;
      const userId = req.user.id;

      // Verificar que la actividad existe y está disponible
      const [activity] = await pool.execute(
        'SELECT * FROM activities WHERE id = ? AND status = ? AND start_time > NOW()',
        [activityId, 'scheduled']
      );

      if (activity.length === 0) {
        return res.status(404).json({ success: false, message: 'Actividad no disponible para inscripción.' });
      }

      // Verificar si ya está inscrito
      const [existing] = await pool.execute(
        'SELECT * FROM activity_attendees WHERE activity_id = ? AND user_id = ?',
        [activityId, userId]
      );

      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya estás inscrito en esta actividad.' });
      }

      // Inscribir
      await pool.execute(
        'INSERT INTO activity_attendees (activity_id, user_id, status) VALUES (?, ?, ?)',
        [activityId, userId, 'registered']
      );

      res.json({ success: true, message: 'Inscripción exitosa.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/activities/bulk
   * Crear actividades recurrentes
   */
  async createBulk(req, res, next) {
    try {
      const { title, description, program_id, room_id, start_time, end_time, estimated_attendees, repeat_until, repeat_days } = req.body;

      if (!title || !program_id || !start_time || !end_time || !repeat_until || !repeat_days) {
        return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
      }

      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      const repeatUntil = new Date(repeat_until);
      
      const activities = [];
      let currentStart = new Date(startDate);
      let currentEnd = new Date(endDate);
      let count = 0;
      const maxIterations = 52; // Máximo 1 año de clases

      while (currentStart <= repeatUntil && count < maxIterations) {
        const activity = await Activity.create({
          title, description, program_id, room_id,
          created_by: req.user.id, 
          start_time: currentStart.toISOString().slice(0, 19).replace('T', ' '),
          end_time: currentEnd.toISOString().slice(0, 19).replace('T', ' '),
          estimated_attendees
        });

        // Auto-inscribir alumnos del programa
        const [enrolled] = await pool.execute(
          'SELECT user_id FROM program_enrollments WHERE program_id = ?', [program_id]
        );
        if (enrolled.length > 0) {
          const values = enrolled.map(e => `(${activity.id}, ${e.user_id}, 'registered', NOW())`).join(',');
          await pool.execute(
            `INSERT IGNORE INTO activity_attendees (activity_id, user_id, status, registered_at) VALUES ${values}`
          );
        }

        activities.push(activity);

        // Agregar los días de repetición
        repeat_days.forEach(day => {
          currentStart.setDate(currentStart.getDate() + (day - currentStart.getDay() + 7) % 7 || 7);
          currentEnd.setDate(currentEnd.getDate() + (day - currentEnd.getDay() + 7) % 7 || 7);
        });

        // Si solo hay un día, avanzar una semana
        if (repeat_days.length === 1) {
          currentStart.setDate(currentStart.getDate() + 7);
          currentEnd.setDate(currentEnd.getDate() + 7);
        }

        count++;
      }

      // Notificar a todos los usuarios
      const [users] = await pool.execute('SELECT id FROM users WHERE active = TRUE');
      if (users.length > 0) {
        await Notification.createBulk(users.map(u => u.id), {
          title: '📅 Nuevas actividades creadas',
          message: `${count} sesiones creadas para "${title}" hasta ${repeatUntil.toLocaleDateString('es-CL')}`,
          type: 'info'
        });
      }

      res.status(201).json({ success: true, message: `${count} actividades creadas.`, data: activities });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = activityController;
