const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', notificationController.getAll);
router.get('/count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.delete);

module.exports = router;
