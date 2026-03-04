const express = require('express');
const router = express.Router();
const ctrl = require('./usuarios.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');


router.use(authMiddleware);
router.use(requireRole('admin'));


router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
