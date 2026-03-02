const { query } = require('../../config/database');

const svc = {
    async getResumen() {
        const [ventas] = await Promise.all([
            query('SELECT COALESCE(SUM(total), 0) as total_ventas, COUNT(*) as num_ventas FROM ventas WHERE DATE(fecha) = CURDATE()'),
        ]);
        const compras = await query('SELECT COALESCE(SUM(total), 0) as total_compras FROM compras WHERE DATE(fecha) = CURDATE()');
        const productos = await query('SELECT COUNT(*) as total_productos FROM productos WHERE activo = TRUE');
        const clientes = await query('SELECT COUNT(*) as total_clientes FROM clientes');
        const stockBajo = await query('SELECT COUNT(*) as total_stock_bajo FROM productos WHERE stock < 10 AND activo = TRUE');

        const totalVentas = parseFloat(ventas[0].total_ventas);
        const totalCompras = parseFloat(compras[0].total_compras);

        return {
            total_ventas: totalVentas,
            num_ventas: ventas[0].num_ventas,
            total_compras: totalCompras,
            ganancia: totalVentas - totalCompras,
            total_productos: productos[0].total_productos,
            total_clientes: clientes[0].total_clientes,
            total_stock_bajo: stockBajo[0].total_stock_bajo
        };
    },

    async getGrafico(tipo = 'ventas', periodo = 30) {
        const dias = parseInt(periodo) || 30;
        if (tipo === 'categorias') {
            return await query(
                `SELECT c.nombre as label, COALESCE(SUM(v.total), 0) as value
         FROM categorias c LEFT JOIN productos p ON c.id = p.categoria_id
         LEFT JOIN ventas v ON p.id = v.producto_id AND v.fecha >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY c.id, c.nombre ORDER BY value DESC`,
                [dias]
            );
        }
        const tabla = tipo === 'compras' ? 'compras' : 'ventas';
        return await query(
            `SELECT DATE(fecha) as fecha, COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
       FROM ${tabla} WHERE fecha >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(fecha) ORDER BY fecha ASC`,
            [dias]
        );
    },

    async getStockBajo() {
        return await query(
            `SELECT p.id, p.nombre, p.codigo, p.stock, c.nombre as categoria_nombre,
        CASE WHEN p.stock = 0 THEN 'SIN_STOCK' WHEN p.stock < 5 THEN 'CRITICO' ELSE 'BAJO' END as nivel
       FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.stock < 10 AND p.activo = TRUE ORDER BY p.stock ASC LIMIT 20`
        );
    },

    async getPedidosPendientes() {
        const rows = await query(`SELECT COUNT(*) as total FROM pedidos WHERE estado IN ('pendiente', 'en_proceso')`);
        return { total: rows[0].total };
    }
};

const ctrl = {
    async getResumen(req, res, next) { try { res.json(await svc.getResumen()); } catch (e) { next(e); } },
    async getGrafico(req, res, next) { try { const { tipo = 'ventas', periodo = 30 } = req.query; res.json(await svc.getGrafico(tipo, periodo)); } catch (e) { next(e); } },
    async getStockBajo(req, res, next) { try { res.json(await svc.getStockBajo()); } catch (e) { next(e); } },
    async getPedidosPendientes(req, res, next) { try { res.json(await svc.getPedidosPendientes()); } catch (e) { next(e); } }
};

module.exports = ctrl;
module.exports.service = svc;
