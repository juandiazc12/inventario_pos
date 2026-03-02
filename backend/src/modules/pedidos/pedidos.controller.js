const { query, getConnection } = require('../../config/database');

const pedidosService = {
    async getAll({ estado } = {}) {
        let sql = `SELECT p.*, pr.nombre as producto_nombre, c.nombre as cliente_nombre, u.nombre as usuario_nombre
               FROM pedidos p JOIN productos pr ON p.producto_id = pr.id
               LEFT JOIN clientes c ON p.cliente_id = c.id
               LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE 1=1`;
        const params = [];
        if (estado) { sql += ' AND p.estado = ?'; params.push(estado); }
        sql += ' ORDER BY p.fecha_pedido DESC';
        return await query(sql, params);
    },

    async getById(id) {
        const rows = await query(
            `SELECT p.*, pr.nombre as producto_nombre, c.nombre as cliente_nombre, u.nombre as usuario_nombre
       FROM pedidos p JOIN productos pr ON p.producto_id = pr.id
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    async crearPedidoMultiple(data, usuarioId) {
        const { items, cliente_id, notas } = data; // items: [{ producto_id, cantidad, precio_venta }]
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            const pedidoIds = [];

            // Usaremos un identificador de grupo para vincular estos pedidos (opcional, o simplemente crearlos individualmente pero en bloque)
            // En este esquema simple, crearemos registros individuales pero todos bajo la misma transacción.
            // Si el frontend necesita agruparlos, podríamos añadir una columna 'grupo_id' en el futuro.
            // Por ahora, al guardarse juntos, comparten fecha y cliente.

            for (const item of items) {
                const { producto_id, cantidad, precio_venta } = item;

                // Verificar existencia (opcional, la FK fallaría si no existe, pero es mejor ser explícito)
                // const [prods] = await conn.execute('SELECT id FROM productos WHERE id = ?', [producto_id]);
                // if (prods.length === 0) throw Object.assign(new Error(`Producto ID ${producto_id} no encontrado`), { status: 404 });

                const [result] = await conn.execute(
                    'INSERT INTO pedidos (producto_id, cantidad, precio_venta, cliente_id, usuario_id, notas, estado) VALUES (?, ?, ?, ?, ?, ?, "pendiente")',
                    [producto_id, cantidad, precio_venta, cliente_id || null, usuarioId, notas || null]
                );
                pedidoIds.push(result.insertId);
            }

            await conn.commit();
            conn.release();

            // Retornamos los IDs creados
            return { mensaje: 'Pedido creado correctamente', pedidos_ids: pedidoIds };

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async updateEstado(id, estado, usuarioId) {
        const pedido = await this.getById(id);
        if (!pedido) throw Object.assign(new Error('Pedido no encontrado'), { status: 404 });

        if (estado === 'completado') {
            // La venta ya fue registrada por finalizarVenta() en el frontend.
            // Solo marcamos el pedido como completado.
            await query('UPDATE pedidos SET estado = ?, fecha_completado = NOW() WHERE id = ?', [estado, id]);
        } else {
            await query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id]);
        }
        return await this.getById(id);
    },

    async remove(id) {
        await query('UPDATE pedidos SET estado = "cancelado" WHERE id = ?', [id]);
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await pedidosService.getAll(req.query)); } catch (e) { next(e); } },
    async getById(req, res, next) { try { const p = await pedidosService.getById(req.params.id); if (!p) return res.status(404).json({ error: true, message: 'Pedido no encontrado' }); res.json(p); } catch (e) { next(e); } },
    async create(req, res, next) { try { res.status(201).json(await pedidosService.crearPedidoMultiple(req.body, req.user.id)); } catch (e) { next(e); } },
    async updateEstado(req, res, next) { try { res.json(await pedidosService.updateEstado(req.params.id, req.body.estado, req.user.id)); } catch (e) { if (e.status) return res.status(e.status).json({ error: true, message: e.message }); next(e); } },
    async remove(req, res, next) { try { await pedidosService.remove(req.params.id); res.json({ message: 'Pedido cancelado' }); } catch (e) { next(e); } }
};

module.exports = ctrl;
module.exports.service = pedidosService;