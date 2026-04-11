const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const attendeeController = require('../controllers/attendeeController');
const serviceController = require('../controllers/serviceController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

// Rutas especiales
router.get('/upcoming', activityController.getUpcoming);
router.get('/calendar', activityController.getCalendar);
router.get('/my-activities', activityController.getMyActivities);
router.get('/my-programs', activityController.getMyPrograms);
router.get('/export', activityController.export);
router.put('/update-status', activityController.updateStatusAuto);
router.post('/:activityId/confirm-attendance', activityController.confirmAttendance);
router.post('/:activityId/enroll', activityController.enrollActivity);

// CRUD actividades
router.get('/', activityController.getAll);
router.get('/:id', activityController.getById);
router.get('/:id/estimate', activityController.getEstimation);
router.post('/', authorize('admin', 'coordinator'), activityController.create);
router.post('/bulk', authorize('admin', 'coordinator'), activityController.createBulk);
router.put('/:id', authorize('admin', 'coordinator'), activityController.update);
router.delete('/:id', authorize('admin', 'coordinator'), activityController.delete);

// Sub-rutas: Asistentes de una actividad
router.get('/:activityId/attendees', attendeeController.getByActivity);
router.post('/:activityId/attendees', authorize('admin', 'coordinator'), attendeeController.register);
router.put('/:activityId/attendees/:userId', authorize('admin', 'coordinator'), attendeeController.updateStatus);
router.delete('/:activityId/attendees/:userId', authorize('admin', 'coordinator'), attendeeController.remove);

// Sub-rutas: Servicios de una actividad
router.get('/:activityId/services', serviceController.getByActivity);
router.post('/:activityId/services', authorize('admin', 'coordinator'), serviceController.assignToActivity);
router.delete('/:activityId/services/:serviceId', authorize('admin', 'coordinator'), serviceController.removeFromActivity);

module.exports = router;
