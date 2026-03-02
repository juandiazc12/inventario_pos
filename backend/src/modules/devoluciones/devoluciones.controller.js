const devolucionesService = require('./devoluciones.service');

const ctrl = {
    async getAll(req, res, next) {
        try {
            const devoluciones = await devolucionesService.getAll(req.query);
            res.json(devoluciones);
        } catch (e) {
            next(e);
        }
    },

    async buscarVenta(req, res, next) {
        try {
            const { q } = req.query;
            if (!q || q.length < 1) return res.json([]);
            const ventas = await devolucionesService.buscarVenta(q);
            res.json(ventas);
        } catch (e) {
            next(e);
        }
    },

    async buscarCompra(req, res, next) {
        try {
            const { q } = req.query;
            if (!q || q.length < 1) return res.json([]);
            const compras = await devolucionesService.buscarCompra(q);
            res.json(compras);
        } catch (e) {
            next(e);
        }
    },

    async getDetalleTicket(req, res, next) {
        try {
            const detalle = await devolucionesService.getDetalleVentaPorTicket(req.params.ticket);
            res.json(detalle);
        } catch (e) {
            next(e);
        }
    },

    async getById(req, res, next) {
        try {
            const devolucion = await devolucionesService.getById(req.params.id);
            if (!devolucion) {
                return res.status(404).json({ 
                    error: true, 
                    message: 'Devolución no encontrada' 
                });
            }
            res.json(devolucion);
        } catch (e) {
            next(e);
        }
    },

    async createDevolucionVenta(req, res, next) {
        try {
            const devolucion = await devolucionesService.createDevolucionVenta(req.body, req.user.id);
            res.status(201).json(devolucion);
        } catch (e) {
            if (e.message.includes('no existe') || e.message.includes('excede')) {
                return res.status(400).json({ 
                    error: true, 
                    message: e.message 
                });
            }
            next(e);
        }
    },

    async createDevolucionCompra(req, res, next) {
        try {
            const devolucion = await devolucionesService.createDevolucionCompra(req.body, req.user.id);
            res.status(201).json(devolucion);
        } catch (e) {
            if (e.message.includes('no existe') || e.message.includes('excede')) {
                return res.status(400).json({ 
                    error: true, 
                    message: e.message 
                });
            }
            next(e);
        }
    },

    async aprobar(req, res, next) {
        try {
            const devolucion = await devolucionesService.aprobar(req.params.id, req.user.id);
            res.json(devolucion);
        } catch (e) {
            if (e.message.includes('no existe') || e.message.includes('pendiente')) {
                return res.status(400).json({ 
                    error: true, 
                    message: e.message 
                });
            }
            next(e);
        }
    },

    async rechazar(req, res, next) {
        try {
            const { motivo } = req.body;
            if (!motivo) {
                return res.status(400).json({ 
                    error: true, 
                    message: 'Debe especificar el motivo del rechazo' 
                });
            }

            const devolucion = await devolucionesService.rechazar(req.params.id, motivo, req.user.id);
            res.json(devolucion);
        } catch (e) {
            if (e.message.includes('No se puede rechazar')) {
                return res.status(400).json({ 
                    error: true, 
                    message: e.message 
                });
            }
            next(e);
        }
    },

    async getStats(req, res, next) {
        try {
            const stats = await devolucionesService.getStats(req.query);
            res.json(stats);
        } catch (e) {
            next(e);
        }
    }
};

module.exports = ctrl;
