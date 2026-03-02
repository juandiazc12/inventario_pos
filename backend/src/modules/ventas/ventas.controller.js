const { query, getConnection } = require('../../config/database');

const ventasService = {
    async getAll({ fecha_inicio, fecha_fin, cliente_id, producto_id } = {}) {
        let sql = `
      SELECT v.*, p.nombre as producto_nombre, p.codigo as producto_codigo,
             c.nombre as cliente_nombre, u.nombre as usuario_nombre
      FROM ventas v
      JOIN productos p ON v.producto_id = p.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (fecha_inicio) { sql += ' AND DATE(v.fecha) >= ?'; params.push(fecha_inicio); }
        if (fecha_fin) { sql += ' AND DATE(v.fecha) <= ?'; params.push(fecha_fin); }
        if (cliente_id) { sql += ' AND v.cliente_id = ?'; params.push(cliente_id); }
        if (producto_id) { sql += ' AND v.producto_id = ?'; params.push(producto_id); }
        sql += ' ORDER BY v.fecha DESC';
        return await query(sql, params);
    },

    async getById(id) {
        const rows = await query(
            `SELECT v.*, p.nombre as producto_nombre, c.nombre as cliente_nombre, u.nombre as usuario_nombre
       FROM ventas v JOIN productos p ON v.producto_id = p.id
       LEFT JOIN clientes c ON v.cliente_id = c.id
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    async registrarVentaMultiple(data, usuarioId) {
        const { items, cliente_id, usuario_id } = data; // items: [{ producto_id, cantidad, precio_venta }]
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            // 1. Generar ticket correlativo ÚNICO para toda la venta
            await conn.execute('UPDATE ticket_counter SET ultimo_numero = ultimo_numero + 1 WHERE id = 1');
            const [counter] = await conn.execute('SELECT * FROM ticket_counter WHERE id = 1');
            const ticketNumero = `${counter[0].prefijo}-${String(counter[0].ultimo_numero).padStart(6, '0')}`;
            let activeClienteId = data.cliente_id;

            // 1.5 Registro dinámico de cliente por nombre
            if (!activeClienteId && data.cliente_nombre) {
                const [existing] = await conn.execute('SELECT id FROM clientes WHERE nombre = ? LIMIT 1', [data.cliente_nombre.trim()]);
                if (existing.length > 0) {
                    activeClienteId = existing[0].id;
                } else {
                    const [created] = await conn.execute('INSERT INTO clientes (nombre) VALUES (?)', [data.cliente_nombre.trim()]);
                    activeClienteId = created.insertId;
                }
            }

            const ventaIds = [];
            let totalVenta = 0;

            // 2. Procesar cada item
            for (const item of items) {
                const { producto_id, cantidad, precio_venta } = item;

                // Verificar stock
                const [prods] = await conn.execute('SELECT * FROM productos WHERE id = ? AND activo = TRUE FOR UPDATE', [producto_id]);
                if (prods.length === 0) throw Object.assign(new Error(`Producto ID ${producto_id} no encontrado`), { status: 404 });

                if (prods[0].stock < cantidad) {
                    throw Object.assign(new Error(`Stock insuficiente para ${prods[0].nombre}. Disponible: ${prods[0].stock}`), { status: 400 });
                }

                // Insertar venta individual vinculada al mismo ticket
                const [result] = await conn.execute(
                    'INSERT INTO ventas (producto_id, cantidad, precio_venta, cliente_id, usuario_id, ticket_numero) VALUES (?, ?, ?, ?, ?, ?)',
                    [producto_id, cantidad, precio_venta, activeClienteId || null, usuarioId, ticketNumero]
                );

                ventaIds.push(result.insertId);
                totalVenta += (cantidad * precio_venta);

                // Decrementar stock
                await conn.execute('UPDATE productos SET stock = stock - ? WHERE id = ?', [cantidad, producto_id]);
            }

            await conn.commit();
            conn.release();

            return {
                mensaje: 'Venta registrada correctamente',
                ticket: ticketNumero,
                total: totalVenta,
                ventas_ids: ventaIds
            };

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async getTicket(ventaId) {
        const rows = await query(
            `SELECT v.*, p.nombre as producto_nombre, p.codigo as producto_codigo,
              c.nombre as cliente_nombre, c.documento as cliente_documento,
              u.nombre as usuario_nombre
       FROM ventas v JOIN productos p ON v.producto_id = p.id
       LEFT JOIN clientes c ON v.cliente_id = c.id
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
            [ventaId]
        );
        return rows[0] || null;
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await ventasService.getAll(req.query)); } catch (e) { next(e); } },
    async getById(req, res, next) { try { const v = await ventasService.getById(req.params.id); if (!v) return res.status(404).json({ error: true, message: 'Venta no encontrada' }); res.json(v); } catch (e) { next(e); } },
    async create(req, res, next) { try { const v = await ventasService.registrarVentaMultiple(req.body, req.user.id); res.status(201).json(v); } catch (e) { if (e.status) return res.status(e.status).json({ error: true, message: e.message }); next(e); } },
    async getTicket(req, res, next) { try { const t = await ventasService.getTicket(req.params.id); if (!t) return res.status(404).json({ error: true, message: 'Ticket no encontrado' }); res.json(t); } catch (e) { next(e); } }
};

module.exports = ctrl;
module.exports.service = ventasService;
