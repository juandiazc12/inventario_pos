const productosService = require('./productos.service');

const productosController = {
    async getAll(req, res, next) {
        try {
            const { categoria, search, stock_bajo } = req.query;
            const productos = await productosService.getAll({ categoria, search, stock_bajo });
            res.json(productos);
        } catch (err) { next(err); }
    },

    async getById(req, res, next) {
        try {
            const producto = await productosService.getById(req.params.id);
            if (!producto) return res.status(404).json({ error: true, message: 'Producto no encontrado' });
            res.json(producto);
        } catch (err) { next(err); }
    },

    async getByCodigo(req, res, next) {
        try {
            const producto = await productosService.getByCodigo(req.params.codigo);
            if (!producto) return res.status(404).json({ error: true, message: 'Producto no encontrado' });
            res.json(producto);
        } catch (err) { next(err); }
    },

    async create(req, res, next) {
        try {
            const producto = await productosService.create(req.body);
            res.status(201).json(producto);
        } catch (err) {
            if (err.status) return res.status(err.status).json({ error: true, message: err.message });
            next(err);
        }
    },

    async update(req, res, next) {
        try {
            const producto = await productosService.update(req.params.id, req.body);
            res.json(producto);
        } catch (err) {
            if (err.status) return res.status(err.status).json({ error: true, message: err.message });
            next(err);
        }
    },

    async remove(req, res, next) {
        try {
            await productosService.delete(req.params.id);
            res.json({ message: 'Producto eliminado correctamente' });
        } catch (err) {
            if (err.status) return res.status(err.status).json({ error: true, message: err.message });
            next(err);
        }
    },

    async getMasVendidos(req, res, next) {
        try {
            const { periodo = 'mes' } = req.query;
            const data = await productosService.getMasVendidos(periodo);
            res.json(data);
        } catch (err) { next(err); }
    },

    async getStockBajo(req, res, next) {
        try {
            const data = await productosService.getStockBajo();
            res.json(data);
        } catch (err) { next(err); }
    },

    async uploadImagen(req, res) {
        try {
            if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });
            const imageUrl = `/uploads/productos/${req.file.filename}`;
            await productosService.updateImagen(req.params.id, imageUrl);
            res.json({ status: 'success', imagen_url: imageUrl, message: 'Imagen subida correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = productosController;
