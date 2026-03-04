const express = require('express');
const router = express.Router();
const ctrl = require('./traslados.controller');
const authMiddleware = require('../../middleware/auth.middleware');


router.use(authMiddleware);


// Rutas estáticas primero
router.get('/ubicaciones', ctrl.getUbicaciones);
router.post('/ubicaciones', ctrl.createUbicacion);
router.get('/inventario/por-ubicacion/:ubicacion_id', ctrl.getInventarioPorUbicacion);
router.get('/buscar-productos', ctrl.buscarProductos);

// Luego rutas dinámicas
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id/despachar', ctrl.despachar);
router.put('/:id/recibir', ctrl.recibir);
router.put('/:id/cancelar', ctrl.cancelar);

module.exports = router;
