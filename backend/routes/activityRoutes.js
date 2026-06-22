const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const attendeeController = require('../controllers/attendeeController');
const serviceController = require('../controllers/serviceController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const checkRole = require('../middleware/authRole');
const auth = require('../middleware/auth');

router.use(authenticate);

// Ruta protegida: solo 'user' (estudiante) puede acceder
router.get('/my-activities/with-services', 
  auth, 
  checkRole(['user', 'alumno']), // Solo permite estos roles
  activityController.getMyActivitiesWithServices
);

// Ruta protegida: solo 'user' (estudiante) puede acceder
router.get('/my-programs', 
  auth, 
  checkRole(['user', 'alumno']), 
  activityController.getMyPrograms
);

// Rutas especiales
router.get('/upcoming', activityController.getUpcoming);
router.get('/calendar', activityController.getCalendar);
router.get('/my-activities', activityController.getMyActivities);
router.get('/my-programs', activityController.getMyPrograms);
router.get('/export', activityController.export);
router.get('/export-semanal', activityController.exportSemanal);
router.put('/update-status', activityController.updateStatusAuto);
router.post('/:activityId/confirm-attendance', activityController.confirmAttendance);
router.post('/:activityId/enroll', activityController.enrollActivity);

// CRUD actividades
router.get('/', activityController.getAll);
router.get('/:id', activityController.getById);
router.get('/:id/estimate', activityController.getEstimation);
router.post('/', authorize('admin', 'coordinator', 'teacher'), activityController.create);
router.post('/bulk', authorize('admin', 'coordinator', 'teacher'), activityController.createBulk);
router.put('/:id', authorize('admin', 'coordinator', 'teacher'), activityController.update);
router.delete('/:id', authorize('admin', 'coordinator', 'teacher'), activityController.delete);

// Sub-rutas: Asistentes de una actividad
router.get('/:activityId/attendees', attendeeController.getByActivity);
router.post('/:activityId/attendees', authorize('admin', 'coordinator', 'teacher'), attendeeController.register);
router.put('/:activityId/attendees/:userId', authorize('admin', 'coordinator', 'teacher'), attendeeController.updateStatus);
router.delete('/:activityId/attendees/:userId', authorize('admin', 'coordinator', 'teacher'), attendeeController.remove);

// Sub-rutas: Servicios de una actividad
router.get('/:activityId/services', serviceController.getByActivity);
router.post('/:activityId/services', authorize('admin', 'coordinator', 'teacher'), serviceController.assignToActivity);
router.delete('/:activityId/services/:serviceId', authorize('admin', 'coordinator', 'teacher'), serviceController.removeFromActivity);
router.get('/:activityId/menu-choices', serviceController.getActivityMenuChoices);

// Sub-rutas: Menú choices para estudiantes
router.get('/my-activities/with-services', activityController.getMyActivitiesWithServices);

module.exports = router;
