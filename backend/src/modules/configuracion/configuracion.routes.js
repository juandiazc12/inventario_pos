const express = require('express');
const router = express.Router();
const configController = require('./configuracion.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const upload = require('../../config/upload');

// Pública (para logo y nombre en login/sidebar sin login)
router.get('/public', configController.getPublicConfig);

// Protegidas
router.use(authMiddleware);
router.get('/', configController.getAll);
router.put('/', configController.update);

// Logo
router.post('/logo',
    (req, res, next) => { req.uploadFolder = 'branding'; next(); },
    upload.single('logo'),
    configController.uploadLogo
);

module.exports = router;
