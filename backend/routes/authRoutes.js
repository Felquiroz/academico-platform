const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');

// Rutas públicas
router.post('/register', authController.register);
router.post('/register-public', authController.registerPublic);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Rutas protegidas
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
