const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/', authorize('admin', 'coordinator', 'teacher'), userController.getAll);
router.get('/:id', authorize('admin', 'coordinator', 'teacher'), userController.getById);
router.put('/:id', authorize('admin'), userController.update);
router.put('/:id/password', authorize('admin'), userController.updatePassword);
router.delete('/:id', authorize('admin'), userController.delete);

module.exports = router;
