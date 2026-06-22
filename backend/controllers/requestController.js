const Request = require('../models/Request');
const Notification = require('../models/Notification');
const pool = require('../config/db');
const { logAudit } = require('../middleware/audit');

const requestController = {
  /**
   * GET /api/requests - Listar solicitudes
   */
  async getAll(req, res, next) {
    try {
      const { status, type, limit, offset } = req.query;
      const requests = await Request.findAll({
        status, type,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      const total = await Request.count({ status });
      res.json({ success: true, data: requests, pagination: { total } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/requests/my - Mis solicitudes
   */
  async getMyRequests(req, res, next) {
    try {
      const requests = await Request.findAll({ requested_by: req.user.id });
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  },

  async getTeachersForForm(req, res, next) {
  try {
    const Request = require('../models/Request');
    const teachers = await Request.getAvailableTeachers();
    res.json({ success: true, data: teachers });
  } catch (error) {
    next(error);
  }
},


  /**
   * POST /api/requests - Crear solicitud
   */
  async create(req, res, next) {
    try {
      // 1. Agregamos teacher_id al destructuring del body
      const { type, title, description, program_id, room_id, start_time, end_time, activity_id, service_ids, teacher_id } = req.body;

      if (!type || !title) {
        return res.status(400).json({ success: false, message: 'Tipo y título son obligatorios.' });
      }

      // 2. LÓGICA DEL PROFESOR: Determinamos quién será el profe de esta solicitud
      let finalTeacherId = null;
      if (req.user.role === 'coordinator') {
        finalTeacherId = req.user.id; // Auto-asignación para el chat y coordinators
      } else if (req.user.role === 'admin') {
       finalTeacherId = teacher_id || req.user.id; // Asignación manual o fallback al admin
      }

      // Si es solicitud de sala, verificar disponibilidad
      if (type === 'room' && room_id && start_time && end_time) {
        const availability = await Request.checkAvailability(room_id, start_time, end_time);
        if (availability.conflicts) {
          return res.status(409).json({ 
            success: false, 
            message: 'La sala no está disponible en ese horario.',
            conflicts: { activities: availability.activities, requests: availability.requests }
          });
        }
      }

      // 3. Enviamos finalTeacherId al modelo Request (necesitarás asegurarte de que
      // tu modelo Request / tabla requests acepte esta columna nueva o usar el 'requested_by' para esto)
      const request = await Request.create({
        type, title, description, 
        requested_by: finalTeacherId || req.user.id, // Guardamos al profesor como el solicitante real
        program_id, room_id, start_time, end_time, activity_id, service_ids,teacher_id: finalTeacherId // Guardamos el teacher_id en la columna correspondiente
      });

      // ... Resto de tu código (Notificar admins y logAudit quedan igual) ...

      // Notificar a admins
      const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin' AND active = TRUE");
      if (admins.length > 0) {
        await Notification.createBulk(admins.map(a => a.id), {
          title: '📋 Nueva Solicitud',
          message: `${req.user.name} ha enviado una solicitud: ${title}`,
          type: 'info'
        });
      }

      await logAudit({
        userId: req.user.id, action: 'CREATE', entityType: 'request',
        entityId: request.id, newValues: request, ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Solicitud enviada.', data: request });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/requests/:id/approve - Aprobar solicitud
   */
  async approve(req, res, next) {
    try {
      const request = await Request.findById(req.params.id);
      if (!request) return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
      if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'La solicitud ya fue procesada.' });

      const updated = await Request.updateStatus(req.params.id, 'approved', req.user.id, req.body.notes);

      // Si es solicitud de sala, crear la actividad
      if (request.type === 'room' && request.room_id) {
        const [actResult] = await pool.execute(
          // Modificamos el INSERT para que el created_by (o teacher_id si lo creaste) sea el profesor (requested_by)
          // en lugar de la persona que está haciendo clic en aprobar (req.user.id)
          `INSERT INTO activities (title, description, program_id, room_id, created_by, start_time, end_time, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            request.title, 
            request.description, 
            request.program_id, 
            request.room_id, 
            request.requested_by, // 🔥 AQUÍ ESTÁ LA MAGIA: El profesor viaja de la Request a la Actividad
            request.start_time, 
            request.end_time, 
            'scheduled'
          ]
        );

        // Asignar servicios solicitados a la actividad
        if (request.service_ids) {
          const serviceIds = typeof request.service_ids === 'string' ? JSON.parse(request.service_ids) : request.service_ids;
          if (Array.isArray(serviceIds) && serviceIds.length > 0) {
            const values = serviceIds.map(sid => `(${actResult.insertId}, ${sid}, 1, NULL)`).join(',');
            await pool.execute(
              `INSERT INTO activity_services (activity_id, service_id, quantity, notes) VALUES ${values}`
            );
          }
        }
      }

      // Notificar al solicitante
      await Notification.create({
        user_id: request.requested_by,
        title: '✅ Solicitud Aprobada',
        message: `Tu solicitud "${request.title}" ha sido aprobada.`,
        type: 'info'
      });

      await logAudit({
        userId: req.user.id, action: 'APPROVE', entityType: 'request',
        entityId: request.id, newValues: { status: 'approved', notes: req.body.notes }, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Solicitud aprobada.', data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/requests/:id/reject - Rechazar solicitud
   */
  async reject(req, res, next) {
    try {
      const request = await Request.findById(req.params.id);
      if (!request) return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
      if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'La solicitud ya fue procesada.' });

      const updated = await Request.updateStatus(req.params.id, 'rejected', req.user.id, req.body.notes);

      // Notificar al solicitante
      await Notification.create({
        user_id: request.requested_by,
        title: '❌ Solicitud Rechazada',
        message: `Tu solicitud "${request.title}" ha sido rechazada.${req.body.notes ? ` Nota: ${req.body.notes}` : ''}`,
        type: 'warning'
      });

      await logAudit({
        userId: req.user.id, action: 'REJECT', entityType: 'request',
        entityId: request.id, newValues: { status: 'rejected', notes: req.body.notes }, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Solicitud rechazada.', data: updated });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/requests/:id/start - Iniciar actividad (profesor)
   */
  async startActivity(req, res, next) {
    try {
      const request = await Request.findById(req.params.id);
      if (!request) return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
      
      // Solo el solicitante o un admin puede iniciar
      if (request.requested_by !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'No tienes permiso para iniciar esta actividad.' });
      }

      // Actualizar estado a in_progress
      await pool.execute('UPDATE activities SET status = ? WHERE id = ?', ['in_progress', request.activity_id]);

      res.json({ success: true, message: 'Actividad iniciada.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = requestController;