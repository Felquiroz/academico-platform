const Program = require('../models/Program');
const { logAudit } = require('../middleware/audit');
const db = require('../config/db'); // NUEVO: Importa tu conexión a la base de datos (ajusta la ruta si es necesario)

const programController = {
  async getAll(req, res, next) {
    try {
      const { type, active, search, limit, offset } = req.query;
      const programs = await Program.findAll({
        type,
        active: active !== undefined ? active === 'true' : undefined,
        search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      const total = await Program.count({ type, active: active !== undefined ? active === 'true' : undefined });
      res.json({ success: true, data: programs, pagination: { total } });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const program = await Program.findById(req.params.id);
      if (!program) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });
      res.json({ success: true, data: program });
    } catch (error) {
      next(error);
    }
  },

  async getStats(req, res, next) {
    try {
      const stats = await Program.getStats(req.params.id);
      if (!stats) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      // NUEVO: Recibimos student_ids desde el req.body enviado por el frontend
      const { name, description, type, start_date, end_date, student_ids } = req.body;

      if (!name || !type || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Nombre, tipo, fecha inicio y fin son obligatorios.' });
      }

      if (!['diplomado', 'magister'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Tipo debe ser "diplomado" o "magister".' });
      }

      // Se crea el programa en la tabla 'programas'
      const program = await Program.create({ name, description, type, start_date, end_date });

      // === NUEVO: GUARDAR ALUMNOS EN LA TABLA INTERMEDIA ===
      if (student_ids && student_ids.length > 0) {
        // Formateamos los datos como pares [programa_id, alumno_id]
        const valoresInscripcion = student_ids.map(alumno_id => [program.id, alumno_id]);
        
        const queryInscripciones = `
          INSERT INTO inscripciones (programa_id, alumno_id) 
          VALUES ?
        `;
        
        // Inserción masiva en la tabla inscripciones
        await db.query(queryInscripciones, [valoresInscripcion]);
      }
      // ====================================================

      await logAudit({
        userId: req.user.id, action: 'CREATE', entityType: 'program',
        entityId: program.id, newValues: { ...program, student_ids }, // NUEVO: Guardamos también los alumnos en la auditoría
        ipAddress: req.ip
      });

      res.status(201).json({ success: true, message: 'Programa creado con alumnos inscritos.', data: program });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      // 1. Extraemos student_ids para manejarlo por separado
      const { student_ids, ...programData } = req.body;
      const programaId = parseInt(req.params.id);

      const old = await Program.findById(programaId);
      if (!old) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });

      // 2. Actualizamos los datos básicos del programa (nombre, fechas, etc.)
      // Usamos programData para no enviar el array de student_ids al modelo Program
      const updated = await Program.update(programaId, programData);

      // === NUEVO: ACTUALIZAR ALUMNOS EN LA TABLA INTERMEDIA ===
      // Solo actualizamos si el frontend envió el campo student_ids
      if (student_ids !== undefined) {
        
        // A. Limpiamos las inscripciones anteriores de este programa específico
        await db.query('DELETE FROM inscripciones WHERE programa_id = ?', [programaId]);
        
        // B. Si la nueva lista trae alumnos, los insertamos todos de golpe
        if (student_ids.length > 0) {
          const valoresInscripcion = student_ids.map(alumno_id => [programaId, alumno_id]);
          const queryInscripciones = `
            INSERT INTO inscripciones (programa_id, alumno_id) 
            VALUES ?
          `;
          await db.query(queryInscripciones, [valoresInscripcion]);
        }
      }
      // ========================================================

      await logAudit({
        userId: req.user.id, action: 'UPDATE', entityType: 'program',
        entityId: programaId, oldValues: old, newValues: { ...updated, student_ids }, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Programa y alumnos actualizados.', data: updated });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const program = await Program.findById(req.params.id);
      if (!program) return res.status(404).json({ success: false, message: 'Programa no encontrado.' });

      await Program.delete(req.params.id);

      await logAudit({
        userId: req.user.id, action: 'DELETE', entityType: 'program',
        entityId: parseInt(req.params.id), oldValues: program, ipAddress: req.ip
      });

      res.json({ success: true, message: 'Programa desactivado.' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = programController;