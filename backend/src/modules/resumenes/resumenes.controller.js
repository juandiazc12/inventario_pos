const { query } = require('../../config/database');

const svc = {
    async getResumen(dias = 1) {
        const ventas = await query(
            `SELECT COALESCE(SUM(total), 0) as total_ventas, COUNT(*) as num_ventas FROM ventas WHERE fecha >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [dias]
        );
        const compras = await query(
            `SELECT COALESCE(SUM(total), 0) as total_compras FROM compras WHERE fecha >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [dias]
        );
        const tv = parseFloat(ventas[0].total_ventas);
        const tc = parseFloat(compras[0].total_compras);
        return {
            total_ventas: tv,
            num_ventas: ventas[0].num_ventas,
            total_compras: tc,
            ganancia: tv - tc
        };
    },

    async getMasVendidos(periodo = 'mes') {
        const periodoMap = { dia: 1, semana: 7, mes: 30 };
        const dias = periodoMap[periodo] || 30;
        return await query(
            `SELECT p.id, p.nombre, p.codigo, SUM(v.cantidad) as total_vendido, SUM(v.total) as total_ingresos
       FROM ventas v JOIN productos p ON v.producto_id = p.id
       WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY p.id, p.nombre, p.codigo ORDER BY total_vendido DESC LIMIT 10`,
            [dias]
        );
    },

    async exportarCSV() {
        return await query(
            `SELECT p.id, p.nombre, p.codigo, c.nombre as categoria, p.precio_compra, p.precio_venta, p.stock, p.activo, p.created_at
       FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.nombre ASC`
        );
    },

    async getVentasRecientes(limit = 10) {
        return await query(
            `SELECT v.id, v.fecha, v.total, v.ticket_numero, c.nombre as cliente_nombre, u.nombre as usuario_nombre
             FROM ventas v 
             LEFT JOIN clientes c ON v.cliente_id = c.id
             LEFT JOIN usuarios u ON v.usuario_id = u.id
             GROUP BY v.ticket_numero, v.fecha, v.total, v.id, c.nombre, u.nombre
             ORDER BY v.fecha DESC LIMIT ?`,
            [limit]
        );
    }
};

const ctrl = {
    async getDiario(req, res, next) { try { res.json(await svc.getResumen(1)); } catch (e) { next(e); } },
    async getSemanal(req, res, next) { try { res.json(await svc.getResumen(7)); } catch (e) { next(e); } },
    async getMensual(req, res, next) { try { res.json(await svc.getResumen(30)); } catch (e) { next(e); } },
    async getVentasRecientes(req, res, next) { try { res.json(await svc.getVentasRecientes(10)); } catch (e) { next(e); } },
    async getMasVendidos(req, res, next) { try { const { periodo = 'mes' } = req.query; res.json(await svc.getMasVendidos(periodo)); } catch (e) { next(e); } },
    async exportarCSV(req, res, next) {
        try {
            const productos = await svc.exportarCSV();
            const headers = ['ID', 'Nombre', 'Código', 'Categoría', 'Precio Compra', 'Precio Venta', 'Stock', 'Activo', 'Creado'];
            const rows = productos.map(p => [p.id, `"${p.nombre}"`, p.codigo || '', `"${p.categoria || ''}"`, p.precio_compra, p.precio_venta, p.stock, p.activo ? 'Si' : 'No', p.created_at].join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="productos_${new Date().toISOString().split('T')[0]}.csv"`);
            res.send('\uFEFF' + csv); // BOM para Excel
        } catch (e) { next(e); }
    }
};

module.exports = ctrl;
