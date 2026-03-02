const express = require('express');
const router = express.Router();
const ctrl = require('./auditoria.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', ctrl.getAll);
router.delete('/limpiar', ctrl.limpiar);

module.exports = router;
