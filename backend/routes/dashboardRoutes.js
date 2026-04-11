const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/my-stats', dashboardController.getMyStats);
router.get('/attendance-chart', dashboardController.getAttendanceChart);
router.get('/upcoming', dashboardController.getUpcoming);
router.get('/conflicts', authorize('admin', 'coordinator'), dashboardController.getConflicts);
router.put('/conflicts/:id/resolve', authorize('admin', 'coordinator'), dashboardController.resolveConflict);
router.get('/optimization', authorize('admin', 'coordinator'), dashboardController.getOptimization);
router.get('/audit', authorize('admin'), dashboardController.getAuditLogs);
router.get('/user/:userId/stats', authorize('admin', 'coordinator'), dashboardController.getUserStats);

module.exports = router;
