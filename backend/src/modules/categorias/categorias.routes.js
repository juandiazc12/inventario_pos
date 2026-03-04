const express = require('express');
const router = express.Router();
const ctrl = require('./categorias.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');


router.use(authMiddleware);


router.get('/', ctrl.getAll);
router.post('/', requireRole('admin'), ctrl.create);
router.put('/:id', requireRole('admin'), ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove);

module.exports = router;
