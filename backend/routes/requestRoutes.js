const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

// Todas las solicitudes (admin/coordinador)
router.get('/', authorize('admin', 'coordinator', 'teacher'), requestController.getAll);

router.get('/teachers', requestController.getTeachersForForm);
// Mis solicitudes
router.get('/my', requestController.getMyRequests);

// Crear solicitud
router.post('/', requestController.create);

// Aprobar/rechazar (solo admin)
router.put('/:id/approve', authorize('admin'), requestController.approve);
router.put('/:id/reject', authorize('admin'), requestController.reject);

// Iniciar actividad (profesor)
router.post('/:id/start', requestController.startActivity);

module.exports = router;