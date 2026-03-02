const express = require('express');
const router = express.Router();
const ctrl = require('./compras.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const auditMiddleware = require('../../middleware/audit.middleware');

router.use(authMiddleware);
router.use(auditMiddleware);

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);

module.exports = router;
