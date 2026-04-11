const pool = require('../config/db');
const Activity = require('../models/Activity');
const ConflictDetector = require('../services/conflictDetector');
const ResourceOptimizer = require('../services/resourceOptimizer');
const AuditLog = require('../models/AuditLog');

const dashboardController = {
  /**
   * GET /api/dashboard/stats
   */
  async getStats(req, res, next) {
    try {
      // Total actividades activas
      const totalActivities = await Activity.count({ status: 'scheduled' });

      // Total programas activos
      const [programs] = await pool.execute("SELECT COUNT(*) as total FROM programs WHERE active = TRUE", []);

      // Total usuarios activos
      const [users] = await pool.execute("SELECT COUNT(*) as total FROM users WHERE active = TRUE", []);

      // Conflictos activos
      const activeConflicts = await ConflictDetector.countActive();

      // Asistencia promedio
      const [attendance] = await pool.execute(`
        SELECT COALESCE(AVG(attendance_rate), 0) as avg_rate 
        FROM attendance_history 
        WHERE year = YEAR(NOW())
      `, []);

      // Total salas
      const [rooms] = await pool.execute("SELECT COUNT(*) as total FROM rooms WHERE active = TRUE", []);

      // Actividades de hoy
      const [todayActivities] = await pool.execute(`
        SELECT COUNT(*) as total FROM activities 
        WHERE DATE(start_time) = CURDATE() AND status != 'cancelled'
      `, []);

      res.json({
        success: true,
        data: {
          total_activities: totalActivities,
          total_programs: programs[0].total,
          total_users: users[0].total,
          total_rooms: rooms[0].total,
          active_conflicts: activeConflicts,
          avg_attendance_rate: Math.round(attendance[0].avg_rate * 100) / 100,
          today_activities: todayActivities[0].total
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/dashboard/attendance-chart
   */
  async getAttendanceChart(req, res, next) {
    try {
      const [rows] = await pool.execute(`
        SELECT ah.month, ah.year, ah.attendance_rate, p.name as program_name
        FROM attendance_history ah
        JOIN programs p ON p.id = ah.program_id
        WHERE ah.year >= YEAR(NOW()) - 1
        ORDER BY ah.year, ah.month
      `, []);

      // Agrupar por mes
      const grouped = {};
      rows.forEach(row => {
        const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
        if (!grouped[key]) {
          grouped[key] = { month: key, programs: {} };
        }
        grouped[key].programs[row.program_name] = row.attendance_rate;
      });

      res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/dashboard/upcoming
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
   * GET /api/dashboard/conflicts
   */
  async getConflicts(req, res, next) {
    try {
      const conflicts = await ConflictDetector.getActiveConflicts();
      res.json({ success: true, data: conflicts });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/dashboard/conflicts/:id/resolve
   */
  async resolveConflict(req, res, next) {
    try {
      await ConflictDetector.resolveConflict(req.params.id);
      res.json({ success: true, message: 'Conflicto resuelto.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/dashboard/optimization?start_date=...&end_date=...
   */
  async getOptimization(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];

      const summary = await ResourceOptimizer.getOptimizationSummary(startDate, endDate);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/dashboard/audit
   */
  async getAuditLogs(req, res, next) {
    try {
      const { user_id, entity_type, start_date, end_date, limit, offset } = req.query;
      const logs = await AuditLog.findAll({
        user_id: parseInt(user_id) || undefined,
        entity_type, start_date, end_date,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      const total = await AuditLog.count({ entity_type });
      res.json({ success: true, data: logs, pagination: { total } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/dashboard/my-stats
   * Estadísticas personalizadas para el usuario logueado
   */
  async getMyStats(req, res, next) {
    try {
      const userId = req.user.id;
      
      const [activities] = await pool.execute(`
        SELECT a.status, COUNT(*) as count
        FROM activity_attendees aa
        JOIN activities a ON a.id = aa.activity_id
        WHERE aa.user_id = ?
        GROUP BY a.status
      `, [userId]);

      const [upcoming] = await pool.execute(`
        SELECT a.id, a.title, a.start_time, a.end_time, r.name as room_name, p.name as program_name
        FROM activity_attendees aa
        JOIN activities a ON a.id = aa.activity_id
        LEFT JOIN rooms r ON r.id = a.room_id
        LEFT JOIN programs p ON p.id = a.program_id
        WHERE aa.user_id = ? AND a.start_time > NOW() AND a.status = 'scheduled'
        ORDER BY a.start_time ASC
        LIMIT 5
      `, [userId]);

      const [recent] = await pool.execute(`
        SELECT a.id, a.title, a.start_time, a.status, p.name as program_name
        FROM activity_attendees aa
        JOIN activities a ON a.id = aa.activity_id
        LEFT JOIN programs p ON p.id = a.program_id
        WHERE aa.user_id = ? AND a.end_time <= NOW()
        ORDER BY a.end_time DESC
        LIMIT 5
      `, [userId]);

      const totalActivities = activities.reduce((sum, a) => sum + a.count, 0);
      const confirmedCount = activities.find(a => a.status === 'confirmed')?.count || 0;
      const attendedCount = activities.find(a => a.status === 'attended')?.count || 0;

      res.json({
        success: true,
        data: {
          total_activities: totalActivities,
          confirmed: confirmedCount,
          attended: attendedCount,
          upcoming: upcoming,
          recent: recent,
          upcoming_count: upcoming.length
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/dashboard/user/:userId/stats
   * Estadísticas de un usuario específico (para admin/coordinadores)
   */
  async getUserStats(req, res, next) {
    try {
      const targetUserId = parseInt(req.params.userId);
      
      const [userInfo] = await pool.execute('SELECT id, name, email, role, active FROM users WHERE id = ?', [targetUserId]);
      if (userInfo.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }

      const [activities] = await pool.execute(`
        SELECT a.status, COUNT(*) as count
        FROM activity_attendees aa
        JOIN activities a ON a.id = aa.activity_id
        WHERE aa.user_id = ?
        GROUP BY a.status
      `, [targetUserId]);

      const [createdActivities] = await pool.execute(`
        SELECT COUNT(*) as total FROM activities WHERE created_by = ?
      `, [targetUserId]);

      const [attendanceRate] = await pool.execute(`
        SELECT 
          COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended,
          COUNT(*) as total
        FROM activity_attendees
        WHERE user_id = ?
      `, [targetUserId]);

      const totalActivities = activities.reduce((sum, a) => sum + a.count, 0);
      const attended = activities.find(a => a.status === 'attended')?.count || 0;
      const rate = attendanceRate[0].total > 0 ? Math.round((attendanceRate[0].attended / attendanceRate[0].total) * 100) : 0;

      res.json({
        success: true,
        data: {
          user: userInfo[0],
          total_enrolled: totalActivities,
          created_activities: createdActivities[0].total,
          attendance_rate: rate,
          by_status: activities
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = dashboardController;
