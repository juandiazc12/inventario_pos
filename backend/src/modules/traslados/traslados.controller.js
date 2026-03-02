const trasladosService = require('./traslados.service');

const ctrl = {
    async getAll(req, res, next) {
        try {
            const traslados = await trasladosService.getAll(req.query);
            res.json(traslados);
        } catch (e) {
            next(e);
        }
    },

    async buscarProductos(req, res, next) {
        try {
            const { q } = req.query;
            if (!q || q.length < 1) return res.json([]);
            const productos = await trasladosService.buscarProductos(q);
            res.json(productos);
        } catch (e) {
            next(e);
        }
    },

    async getById(req, res, next) {
        try {
            const traslado = await trasladosService.getById(req.params.id);
            if (!traslado) {
                return res.status(404).json({
                    error: true,
                    message: 'Traslado no encontrado'
                });
            }
            res.json(traslado);
        } catch (e) {
            next(e);
        }
    },

    async create(req, res, next) {
        try {
            if (req.user.rol !== 'admin') {
                return res.status(403).json({ error: true, message: 'Solo el administrador puede hacer solicitud a bodega' });
            }
            const traslado = await trasladosService.create(req.body, req.user.id);

            // Emitir evento Socket.io si está disponible
            const io = req.app.get('io');
            if (io) {
                io.emit('traslado:nuevo', traslado);
            }

            res.status(201).json(traslado);
        } catch (e) {
            if (e.message.includes('Stock insuficiente') || e.message.includes('diferentes')) {
                return res.status(400).json({
                    error: true,
                    message: e.message
                });
            }
            next(e);
        }
    },

    async despachar(req, res, next) {
        try {
            const traslado = await trasladosService.despachar(
                req.params.id,
                req.body,
                req.user.id
            );

            // Emitir evento Socket.io
            const io = req.app.get('io');
            if (io) {
                io.emit('traslado:despachado', traslado);
            }

            res.json(traslado);
        } catch (e) {
            if (e.message.includes('no existe') || e.message.includes('Stock insuficiente')) {
                return res.status(400).json({
                    error: true,
                    message: e.message
                });
            }
            next(e);
        }
    },

    async recibir(req, res, next) {
        try {
            const traslado = await trasladosService.recibir(req.params.id, req.user.id);

            // Emitir evento Socket.io
            const io = req.app.get('io');
            if (io) {
                io.emit('traslado:recibido', traslado);
            }

            res.json(traslado);
        } catch (e) {
            if (e.message.includes('no existe') || e.message.includes('despachado')) {
                return res.status(400).json({
                    error: true,
                    message: e.message
                });
            }
            next(e);
        }
    },

    async cancelar(req, res, next) {
        try {
            const traslado = await trasladosService.cancelar(req.params.id, req.user.id);
            res.json(traslado);
        } catch (e) {
            if (e.message.includes('No se puede cancelar')) {
                return res.status(400).json({
                    error: true,
                    message: e.message
                });
            }
            next(e);
        }
    },

    async getUbicaciones(req, res, next) {
        try {
            const ubicaciones = await trasladosService.getUbicaciones();
            res.json(ubicaciones);
        } catch (e) {
            next(e);
        }
    },

    async createUbicacion(req, res, next) {
        try {
            const ubicacion = await trasladosService.createUbicacion(req.body);
            res.status(201).json(ubicacion);
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    error: true,
                    message: 'Ya existe una ubicación con ese nombre'
                });
            }
            next(e);
        }
    },

    async getInventarioPorUbicacion(req, res, next) {
        try {
            const inventario = await trasladosService.getInventarioPorUbicacion(req.params.ubicacion_id);
            res.json(inventario);
        } catch (e) {
            next(e);
        }
    }
};

module.exports = ctrl;
