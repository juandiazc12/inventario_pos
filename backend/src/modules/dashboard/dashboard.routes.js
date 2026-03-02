const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/resumen', ctrl.getResumen);
router.get('/grafico', ctrl.getGrafico);
router.get('/stock-bajo', ctrl.getStockBajo);
router.get('/pedidos-pendientes', ctrl.getPedidosPendientes);

module.exports = router;
