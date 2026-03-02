const { query } = require('../../config/database');

const productosService = {
    async getAll({ categoria, search, stock_bajo } = {}) {
        let sql = `
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = TRUE
    `;
        const params = [];

        if (categoria) { sql += ' AND p.categoria_id = ?'; params.push(categoria); }
        if (search) { sql += ' AND (p.nombre LIKE ? OR p.codigo LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (stock_bajo === 'true') { sql += ' AND p.stock < 10'; }

        sql += ' ORDER BY p.nombre ASC';
        return await query(sql, params);
    },

    async getById(id) {
        const rows = await query(
            'SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?',
            [id]
        );
        return rows[0] || null;
    },

    async getByCodigo(codigo) {
        const rows = await query(
            'SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.codigo = ? AND p.activo = TRUE',
            [codigo]
        );
        return rows[0] || null;
    },

    async create(data) {
        const { nombre, codigo, categoria_id, precio_compra, precio_venta, stock, talla, imagen_url, qr_code } = data;

        if (codigo) {
            const existing = await query('SELECT id FROM productos WHERE codigo = ?', [codigo]);
            if (existing.length > 0) {
                const err = new Error('Ya existe un producto con ese código');
                err.status = 409;
                throw err;
            }
        }

        const result = await query(
            'INSERT INTO productos (nombre, codigo, categoria_id, precio_compra, precio_venta, stock, talla, imagen_url, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, codigo || null, categoria_id || null, precio_compra || 0, precio_venta || 0, stock || 0, talla || null, imagen_url || null, qr_code || null]
        );
        return await this.getById(result.insertId);
    },

    async update(id, data) {
        const { nombre, codigo, categoria_id, precio_compra, precio_venta, stock, talla, imagen_url, qr_code, activo } = data;

        if (codigo) {
            const existing = await query('SELECT id FROM productos WHERE codigo = ? AND id != ?', [codigo, id]);
            if (existing.length > 0) {
                const err = new Error('Ya existe otro producto con ese código');
                err.status = 409;
                throw err;
            }
        }

        await query(
            `UPDATE productos SET nombre=?, codigo=?, categoria_id=?, precio_compra=?, precio_venta=?, stock=?, talla=?, imagen_url=?, qr_code=?, activo=? WHERE id=?`,
            [nombre, codigo || null, categoria_id || null, precio_compra || 0, precio_venta || 0, stock || 0, talla || null, imagen_url || null, qr_code || null, activo !== undefined ? activo : true, id]
        );
        return await this.getById(id);
    },

    async updateImagen(id, imageUrl) {
        await query('UPDATE productos SET imagen_url = ? WHERE id = ?', [imageUrl, id]);
        return true;
    },

    async delete(id) {
        const ventas = await query('SELECT COUNT(*) as total FROM ventas WHERE producto_id = ?', [id]);
        if (ventas[0].total > 0) {
            // Soft delete
            await query('UPDATE productos SET activo = FALSE WHERE id = ?', [id]);
        } else {
            await query('DELETE FROM productos WHERE id = ?', [id]);
        }
    },

    async getMasVendidos(periodo = 'mes') {
        const periodoMap = { dia: 1, semana: 7, mes: 30 };
        const dias = periodoMap[periodo] || 30;
        return await query(
            `SELECT p.id, p.nombre, p.codigo, SUM(v.cantidad) as total_vendido, SUM(v.total) as total_ingresos
       FROM ventas v JOIN productos p ON v.producto_id = p.id
       WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY p.id, p.nombre, p.codigo
       ORDER BY total_vendido DESC LIMIT 10`,
            [dias]
        );
    },

    async getStockBajo() {
        const rows = await query(
            `SELECT p.*, c.nombre as categoria_nombre,
        CASE WHEN p.stock = 0 THEN 'SIN_STOCK' WHEN p.stock < 5 THEN 'CRITICO' ELSE 'BAJO' END as nivel_stock
       FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.stock < 10 AND p.activo = TRUE ORDER BY p.stock ASC`,
            []
        );
        return rows;
    }
};

module.exports = productosService;
