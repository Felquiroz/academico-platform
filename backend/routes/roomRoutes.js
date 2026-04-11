const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

// Rutas especiales (antes de /:id para que no colisionen)
router.get('/check-availability', roomController.checkAvailability);
router.get('/suggest', roomController.suggest);

router.get('/', roomController.getAll);
router.get('/:id', roomController.getById);
router.get('/:id/usage', roomController.getUsage);
router.post('/', authorize('admin'), roomController.create);
router.put('/:id', authorize('admin'), roomController.update);
router.delete('/:id', authorize('admin'), roomController.delete);

module.exports = router;
