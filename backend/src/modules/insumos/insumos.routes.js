const express = require('express');
const router = express.Router();
const ctrl = require('./insumos.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const auditMiddleware = require('../../middleware/audit.middleware');

router.use(authMiddleware);
router.use(auditMiddleware);

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
