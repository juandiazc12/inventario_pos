const express = require('express');
const router = express.Router();
const ctrl = require('./devoluciones.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const auditMiddleware = require('../../middleware/audit.middleware');

router.use(authMiddleware);
router.use(auditMiddleware);

// Rutas estáticas primero
router.get('/stats/resumen', ctrl.getStats);
router.get('/buscar-venta', ctrl.buscarVenta);
router.get('/buscar-compra', ctrl.buscarCompra);
router.get('/detalle-ticket/:ticket', ctrl.getDetalleTicket);

// Luego rutas dinámicas
router.get('/', ctrl.getAll);
router.post('/venta', ctrl.createDevolucionVenta);
router.post('/compra', ctrl.createDevolucionCompra);
router.get('/:id', ctrl.getById);
router.put('/:id/aprobar', ctrl.aprobar);
router.put('/:id/rechazar', ctrl.rechazar);

module.exports = router;
