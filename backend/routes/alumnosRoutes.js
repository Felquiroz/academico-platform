const express = require('express');
const router = express.Router();
const alumnoController = require('../controllers/alumnoController');
const authenticate = require('../middleware/auth');

// Solo usuarios autenticados pueden ver la lista de alumnos
router.use(authenticate); 

// Ruta principal: GET /alumnos
router.get('/', alumnoController.getAll);

module.exports = router;