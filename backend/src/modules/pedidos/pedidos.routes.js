const express = require('express');
const router = express.Router();
const ctrl = require('./pedidos.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const auditMiddleware = require('../../middleware/audit.middleware');

router.use(authMiddleware);
router.use(auditMiddleware);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id/estado', ctrl.updateEstado);
router.delete('/:id', ctrl.remove);

module.exports = router;
