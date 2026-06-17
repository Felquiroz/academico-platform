const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(authenticate);

// Reports (must be before :id routes)
router.get('/export/menus-pdf', authorize('admin', 'coordinator', 'teacher'), serviceController.exportMenus);

router.get('/', serviceController.getAll);
router.get('/:id', serviceController.getById);
router.post('/', authorize('admin', 'coordinator', 'teacher'), serviceController.create);
router.put('/:id', authorize('admin', 'coordinator', 'teacher'), serviceController.update);
router.delete('/:id', authorize('admin'), serviceController.delete);

// Menu options CRUD
router.get('/:id/menu-options', serviceController.getMenuOptions);
router.post('/:id/menu-options', authorize('admin', 'coordinator', 'teacher'), serviceController.addMenuOption);
router.delete('/menu-options/:optionId', authorize('admin', 'coordinator', 'teacher'), serviceController.removeMenuOption);

// Student menu choices
router.get('/menu-choices/my', serviceController.getMyMenuChoices);
router.post('/menu-choices/save', serviceController.saveMenuChoice);

// Activity services (assign services to activities)
router.post('/activities/:activityId/services', authorize('admin', 'coordinator', 'teacher'), serviceController.assignToActivity);
router.get('/activities/:activityId/services', serviceController.getByActivity);
router.delete('/activities/:activityId/services/:serviceId', authorize('admin', 'coordinator', 'teacher'), serviceController.removeFromActivity);

module.exports = router;
