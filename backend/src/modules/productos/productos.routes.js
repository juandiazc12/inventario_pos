const express = require('express');
const router = express.Router();
const productosController = require('./productos.controller');
const upload = require('../../config/upload');
const authMiddleware = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');


router.use(authMiddleware);


router.get('/', productosController.getAll);
router.get('/mas-vendidos', productosController.getMasVendidos);
router.get('/stock-bajo', productosController.getStockBajo);
router.get('/codigo/:codigo', productosController.getByCodigo);
router.get('/:id', productosController.getById);

// Rutas protegidas por rol
router.post('/', requireRole('admin'), productosController.create);
router.put('/:id', requireRole('admin'), productosController.update);
router.delete('/:id', requireRole('admin'), productosController.remove);

// Upload imagen
router.post('/:id/imagen',
    requireRole('admin'),
    (req, res, next) => { req.uploadFolder = 'productos'; next(); },
    upload.single('imagen'),
    productosController.uploadImagen
);

module.exports = router;
