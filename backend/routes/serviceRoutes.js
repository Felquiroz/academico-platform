const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/', serviceController.getAll);
router.get('/:id', serviceController.getById);
router.post('/', authorize('admin', 'coordinator'), serviceController.create);
router.put('/:id', authorize('admin', 'coordinator'), serviceController.update);
router.delete('/:id', authorize('admin'), serviceController.delete);

module.exports = router;
