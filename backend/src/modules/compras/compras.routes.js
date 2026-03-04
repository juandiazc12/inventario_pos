const express = require('express');
const router = express.Router();
const ctrl = require('./compras.controller');
const authMiddleware = require('../../middleware/auth.middleware');


router.use(authMiddleware);


router.get('/', ctrl.getAll);
router.post('/', ctrl.create);

module.exports = router;
