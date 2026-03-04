const express = require('express');
const router = express.Router();
const ctrl = require('./ventas.controller');
const authMiddleware = require('../../middleware/auth.middleware');


router.use(authMiddleware);


router.get('/', ctrl.getAll);
router.get('/ticket/:id', ctrl.getTicket);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);

module.exports = router;
