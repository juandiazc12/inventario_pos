const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authMiddleware, authController.logout);

// GET /api/auth/me
router.get('/me', authMiddleware, authController.getMe);

// PUT /api/auth/password
router.put('/password', authMiddleware, authController.changePassword);

module.exports = router;
