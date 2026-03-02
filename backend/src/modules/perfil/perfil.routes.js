const express = require('express');
const router = express.Router();
const perfilController = require('./perfil.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const upload = require('../../config/upload');

router.use(authMiddleware);

router.get('/', perfilController.getPerfil);
router.put('/', perfilController.updatePerfil);
router.put('/password', perfilController.changePassword);

router.post('/avatar',
    (req, res, next) => { req.uploadFolder = 'avatars'; next(); },
    upload.single('avatar'),
    perfilController.uploadAvatar
);

module.exports = router;
