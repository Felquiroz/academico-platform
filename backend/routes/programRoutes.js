const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/', programController.getAll);
router.get('/:id', programController.getById);
router.get('/:id/stats', programController.getStats);
router.post('/', authorize('admin', 'coordinator'), programController.create);
router.put('/:id', authorize('admin', 'coordinator'), programController.update);
router.delete('/:id', authorize('admin'), programController.delete);

module.exports = router;
