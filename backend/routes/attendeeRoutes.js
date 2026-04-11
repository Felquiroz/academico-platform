const express = require('express');
const router = express.Router();
const attendeeController = require('../controllers/attendeeController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// Obtener actividades de un usuario específico
router.get('/user/:userId', attendeeController.getByUser);

module.exports = router;
