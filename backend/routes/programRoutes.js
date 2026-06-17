const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.get('/', programController.getAll);
router.get('/:id', programController.getById);
router.get('/:id/stats', programController.getStats);
router.get('/:id/enrollments', programController.getEnrollments);
router.post('/:id/enroll', authorize('admin', 'coordinator', 'teacher'), programController.enrollUsers);
router.delete('/:id/enroll/:userId', authorize('admin', 'coordinator', 'teacher'), programController.removeEnrolledUser);
router.post('/', authorize('admin', 'coordinator', 'teacher'), programController.create);
router.put('/:id', authorize('admin', 'coordinator', 'teacher'), programController.update);
router.delete('/:id', authorize('admin'), programController.delete);

module.exports = router;
