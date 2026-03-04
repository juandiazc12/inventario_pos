const { query, getConnection } = require('../../config/database');

const comprasService = {
    async getAll({ fecha_inicio, fecha_fin, proveedor_id, busqueda } = {}) {
        let sql = `SELECT c.*, p.nombre as producto_nombre, p.codigo as producto_codigo, 
                       pr.nombre as proveedor_nombre, u.nombre as usuario_nombre
                FROM compras c 
                JOIN productos p ON c.producto_id = p.id
                LEFT JOIN proveedores pr ON c.proveedor_id = pr.id
                LEFT JOIN usuarios u ON c.usuario_id = u.id WHERE 1=1`;
        const params = [];
        if (fecha_inicio) { sql += ' AND DATE(c.fecha) >= ?'; params.push(fecha_inicio); }
        if (fecha_fin) { sql += ' AND DATE(c.fecha) <= ?'; params.push(fecha_fin); }
        if (proveedor_id) { sql += ' AND c.proveedor_id = ?'; params.push(proveedor_id); }

        if (busqueda) {
            sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ? OR pr.nombre LIKE ?)';
            const b = `%${busqueda}%`;
            params.push(b, b, b);
        }

        sql += ' ORDER BY c.fecha DESC';
        return await query(sql, params);
    },

    async registrarCompra(data, usuarioId) {
        const { producto_id, cantidad, precio_compra, proveedor_id } = data;
        const conn = await getConnection();
        try {
            await conn.beginTransaction();

            // 1. Insertar compra
            const [result] = await conn.execute(
                'INSERT INTO compras (producto_id, cantidad, precio_compra, proveedor_id, usuario_id) VALUES (?, ?, ?, ?, ?)',
                [producto_id, cantidad, precio_compra, proveedor_id || null, usuarioId]
            );

            // 2. Incrementar stock
            await conn.execute('UPDATE productos SET stock = stock + ? WHERE id = ?', [cantidad, producto_id]);

            // 3. Actualizar precio_compra si cambió
            await conn.execute('UPDATE productos SET precio_compra = ? WHERE id = ?', [precio_compra, producto_id]);

            await conn.commit();
            conn.release();

            const rows = await query(
                `SELECT c.*, p.nombre as producto_nombre, pr.nombre as proveedor_nombre
         FROM compras c JOIN productos p ON c.producto_id = p.id
         LEFT JOIN proveedores pr ON c.proveedor_id = pr.id WHERE c.id = ?`,
                [result.insertId]
            );
            return rows[0];
        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await comprasService.getAll(req.query)); } catch (e) { next(e); } },
    async create(req, res, next) { try { res.status(201).json(await comprasService.registrarCompra(req.body, req.user.id)); } catch (e) { if (e.status) return res.status(e.status).json({ error: true, message: e.message }); next(e); } }
};

module.exports = ctrl;
module.exports.service = comprasService;
