const express = require('express');
const router = express.Router();
const ctrl = require('./resumenes.controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/diario', ctrl.getDiario);
router.get('/semanal', ctrl.getSemanal);
router.get('/mensual', ctrl.getMensual);
router.get('/ventas-recientes', ctrl.getVentasRecientes);
router.get('/exportar', ctrl.exportarCSV);
router.get('/mas-vendidos', ctrl.getMasVendidos);

module.exports = router;
