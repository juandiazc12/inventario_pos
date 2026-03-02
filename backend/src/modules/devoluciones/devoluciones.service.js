const { query, getConnection } = require('../../config/database');

const devolucionesService = {
    async buscarVenta(q) {
        return await query(
            `SELECT DISTINCT 
                v.ticket_numero,
                v.fecha,
                COALESCE(c.nombre, 'Sin cliente') as cliente_nombre,
                COUNT(v.id) as total_productos,
                SUM(v.cantidad * v.precio_venta) as total
             FROM ventas v
             LEFT JOIN clientes c ON v.cliente_id = c.id
             LEFT JOIN productos p ON v.producto_id = p.id
             WHERE v.ticket_numero LIKE ?
                OR c.nombre LIKE ?
                OR p.codigo = ?
                OR p.nombre LIKE ?
             GROUP BY v.ticket_numero
             ORDER BY v.fecha DESC
             LIMIT 15`,
            [`%${q}%`, `%${q}%`, q, `%${q}%`]
        );
    },

    async getDetalleVentaPorTicket(ticket) {
        return await query(
            `SELECT v.id, v.ticket_numero, v.fecha, v.cantidad, v.precio_venta,
                    p.id as producto_id, p.nombre as producto_nombre, p.codigo as producto_codigo,
                    COALESCE(c.nombre, 'Sin cliente') as cliente_nombre
             FROM ventas v
             JOIN productos p ON v.producto_id = p.id
             LEFT JOIN clientes c ON v.cliente_id = c.id
             WHERE v.ticket_numero = ?`,
            [ticket]
        );
    },

    async buscarCompra(q) {
        return await query(
            `SELECT DISTINCT
                c.id, c.fecha, c.cantidad, c.precio_compra,
                COALESCE(pr.nombre, 'Sin proveedor') as proveedor_nombre,
                p.nombre as producto_nombre, p.codigo as producto_codigo,
                p.id as producto_id,
                (c.cantidad * c.precio_compra) as total
             FROM compras c
             LEFT JOIN proveedores pr ON c.proveedor_id = pr.id
             LEFT JOIN productos p ON c.producto_id = p.id
             WHERE CAST(c.id AS CHAR) LIKE ?
                OR pr.nombre LIKE ?
                OR p.codigo = ?
                OR p.nombre LIKE ?
             ORDER BY c.fecha DESC
             LIMIT 15`,
            [`%${q}%`, `%${q}%`, q, `%${q}%`]
        );
    },

    async getAll({ tipo, estado, fecha_inicio, fecha_fin, motivo } = {}) {
        let sql = `
            SELECT d.*, 
                   u.nombre as usuario_nombre,
                   CASE 
                       WHEN d.tipo = 'venta' THEN (
                           SELECT COALESCE(c.nombre, 'Sin cliente') FROM ventas v 
                           LEFT JOIN clientes c ON v.cliente_id = c.id 
                           WHERE v.ticket_numero = d.referencia_ticket LIMIT 1
                       )
                       WHEN d.tipo = 'compra' THEN (
                           SELECT p.nombre FROM compras c 
                           JOIN proveedores p ON c.proveedor_id = p.id 
                           WHERE c.id = d.referencia_id LIMIT 1
                       )
                   END as referencia_nombre,
                   (SELECT COUNT(*) FROM devoluciones_detalle dd WHERE dd.devolucion_id = d.id) as total_items
            FROM devoluciones d
            LEFT JOIN usuarios u ON d.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];
        
        if (tipo) { sql += ' AND d.tipo = ?'; params.push(tipo); }
        if (estado) { sql += ' AND d.estado = ?'; params.push(estado); }
        if (motivo) { sql += ' AND d.motivo = ?'; params.push(motivo); }
        if (fecha_inicio) { sql += ' AND DATE(d.created_at) >= ?'; params.push(fecha_inicio); }
        if (fecha_fin) { sql += ' AND DATE(d.created_at) <= ?'; params.push(fecha_fin); }
        
        sql += ' ORDER BY d.created_at DESC';
        return await query(sql, params);
    },

    async getById(id) {
        const devolucion = await query(
            `SELECT d.*, u.nombre as usuario_nombre
             FROM devoluciones d
             LEFT JOIN usuarios u ON d.usuario_id = u.id
             WHERE d.id = ?`,
            [id]
        );

        if (devolucion.length === 0) return null;

        const detalle = await query(
            `SELECT dd.*, p.nombre as producto_nombre, p.codigo as producto_codigo
             FROM devoluciones_detalle dd
             JOIN productos p ON dd.producto_id = p.id
             WHERE dd.devolucion_id = ?`,
            [id]
        );

        let referenciaInfo = null;
        if (devolucion[0].tipo === 'venta') {
            // FIX B-1: usar ticket_numero (referencia_ticket) para buscar la venta
            const ticket = devolucion[0].referencia_ticket || devolucion[0].referencia_id;
            const venta = await query(
                `SELECT v.ticket_numero, v.fecha,
                        COALESCE(c.nombre, 'Sin cliente') as cliente_nombre,
                        COALESCE(c.documento, '') as cliente_documento
                 FROM ventas v
                 LEFT JOIN clientes c ON v.cliente_id = c.id
                 WHERE v.ticket_numero = ?
                 LIMIT 1`,
                [ticket]
            );
            referenciaInfo = venta[0] || null;
        } else if (devolucion[0].tipo === 'compra') {
            const compra = await query(
                `SELECT c.*, p.nombre as proveedor_nombre
                 FROM compras c
                 LEFT JOIN proveedores p ON c.proveedor_id = p.id
                 WHERE c.id = ?`,
                [devolucion[0].referencia_id]
            );
            referenciaInfo = compra[0] || null;
        }

        return {
            ...devolucion[0],
            detalle,
            referencia: referenciaInfo
        };
    },

    async generarCodigo() {
        const result = await query(
            'SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)), 0) as ultimo FROM devoluciones WHERE codigo LIKE "DEV-%"'
        );
        const siguiente = result[0].ultimo + 1;
        return `DEV-${String(siguiente).padStart(4, '0')}`;
    },

    // FIX B-1/B-2: ahora recibe ticket_numero como referencia para devoluciones de venta
    async createDevolucionVenta(data, usuarioId) {
        const { ticket_numero, productos, motivo, motivo_detalle, tipo_reembolso, afecta_inventario, notas } = data;
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            // FIX B-1: Validar que el ticket existe buscando por ticket_numero
            if (!ticket_numero) {
                throw new Error('Debe especificar el número de ticket de la venta');
            }

            const [lineasVenta] = await conn.execute(
                `SELECT v.id, v.ticket_numero, v.producto_id, v.cantidad, v.precio_venta,
                        p.nombre as producto_nombre,
                        COALESCE(c.nombre, 'Sin cliente') as cliente_nombre
                 FROM ventas v
                 JOIN productos p ON v.producto_id = p.id
                 LEFT JOIN clientes c ON v.cliente_id = c.id
                 WHERE v.ticket_numero = ?`,
                [ticket_numero]
            );

            if (lineasVenta.length === 0) {
                throw new Error(`El ticket "${ticket_numero}" no existe en el sistema`);
            }

            // Construir mapa de producto_id → cantidad_vendida para validación rápida
            const mapaVenta = {};
            for (const linea of lineasVenta) {
                if (!mapaVenta[linea.producto_id]) {
                    mapaVenta[linea.producto_id] = { cantidad: 0, precio: linea.precio_venta };
                }
                mapaVenta[linea.producto_id].cantidad += linea.cantidad;
            }

            // Generar código
            const codigo = await this.generarCodigo();

            // Insertar devolución — guardamos el ticket como referencia legible
            const [result] = await conn.execute(
                `INSERT INTO devoluciones (codigo, tipo, referencia_id, referencia_ticket, usuario_id, motivo, motivo_detalle, tipo_reembolso, afecta_inventario, notas)
                 VALUES (?, 'venta', NULL, ?, ?, ?, ?, ?, ?, ?)`,
                [codigo, ticket_numero, usuarioId, motivo, motivo_detalle, tipo_reembolso, afecta_inventario ? 1 : 0, notas]
            );

            const devolucionId = result.insertId;
            let totalDevuelto = 0;

            // Procesar productos
            for (const item of productos) {
                const { producto_id, cantidad } = item;

                // FIX B-3: Validar null y que el producto estaba en el ticket
                const ventaProducto = mapaVenta[producto_id];

                if (!ventaProducto || ventaProducto.cantidad === null) {
                    throw new Error(`El producto ID ${producto_id} no pertenece al ticket "${ticket_numero}"`);
                }

                if (cantidad <= 0) {
                    throw new Error(`La cantidad a devolver del producto ID ${producto_id} debe ser mayor a 0`);
                }

                if (cantidad > ventaProducto.cantidad) {
                    throw new Error(`La cantidad a devolver (${cantidad}) del producto ID ${producto_id} excede la cantidad vendida (${ventaProducto.cantidad})`);
                }

                // Verificar que no se haya devuelto más de lo permitido anteriormente
                const [yaDevuelto] = await conn.execute(
                    `SELECT COALESCE(SUM(dd.cantidad), 0) as total_devuelto
                     FROM devoluciones_detalle dd
                     JOIN devoluciones d ON dd.devolucion_id = d.id
                     WHERE d.referencia_ticket = ? 
                       AND dd.producto_id = ?
                       AND d.estado IN ('pendiente', 'aprobada')
                       AND d.tipo = 'venta'`,
                    [ticket_numero, producto_id]
                );

                const cantidadYaDevuelta = Number(yaDevuelto[0].total_devuelto) || 0;
                const disponibleParaDevolver = ventaProducto.cantidad - cantidadYaDevuelta;

                if (cantidad > disponibleParaDevolver) {
                    throw new Error(`Solo quedan ${disponibleParaDevolver} unidades disponibles para devolver del producto ID ${producto_id}`);
                }

                const subtotal = cantidad * ventaProducto.precio;
                totalDevuelto += subtotal;

                // Insertar detalle
                await conn.execute(
                    `INSERT INTO devoluciones_detalle (devolucion_id, producto_id, cantidad, precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [devolucionId, producto_id, cantidad, ventaProducto.precio, subtotal]
                );
            }

            // Actualizar total devuelto
            await conn.execute(
                'UPDATE devoluciones SET total_devuelto = ? WHERE id = ?',
                [totalDevuelto, devolucionId]
            );

            await conn.commit();
            conn.release();

            console.log(`[AUDITORIA] Devolución de venta ${codigo} creada por usuario ${usuarioId} para ticket ${ticket_numero}`);
            return await this.getById(devolucionId);

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async createDevolucionCompra(data, usuarioId) {
        const { referencia_id, productos, motivo, motivo_detalle, tipo_reembolso, afecta_inventario, notas } = data;
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            // Verificar que la compra existe
            const [compra] = await conn.execute(
                'SELECT c.*, p.nombre as proveedor_nombre FROM compras c LEFT JOIN proveedores p ON c.proveedor_id = p.id WHERE c.id = ?',
                [referencia_id]
            );

            if (compra.length === 0) {
                throw new Error('La compra de referencia no existe');
            }

            // Generar código
            const codigo = await this.generarCodigo();

            // Insertar devolución
            const [result] = await conn.execute(
                `INSERT INTO devoluciones (codigo, tipo, referencia_id, usuario_id, motivo, motivo_detalle, tipo_reembolso, afecta_inventario, notas)
                 VALUES (?, 'compra', ?, ?, ?, ?, ?, ?, ?)`,
                [codigo, referencia_id, usuarioId, motivo, motivo_detalle, tipo_reembolso, afecta_inventario ? 1 : 0, notas]
            );

            const devolucionId = result.insertId;
            let totalDevuelto = 0;

            // Procesar productos
            for (const item of productos) {
                const { producto_id, cantidad } = item;

                if (cantidad <= 0) {
                    throw new Error(`La cantidad a devolver del producto ID ${producto_id} debe ser mayor a 0`);
                }

                // FIX B-3: Verificar con null-check correcto
                const [compraProducto] = await conn.execute(
                    `SELECT SUM(cantidad) as cantidad_comprada, precio_compra 
                     FROM compras 
                     WHERE id = ? AND producto_id = ?`,
                    [referencia_id, producto_id]
                );

                // FIX B-3: Si SUM retorna null, el producto no está en la compra
                if (compraProducto.length === 0 || compraProducto[0].cantidad_comprada === null) {
                    throw new Error(`El producto ID ${producto_id} no pertenece a la compra #${referencia_id}`);
                }

                if (cantidad > compraProducto[0].cantidad_comprada) {
                    throw new Error(`La cantidad a devolver (${cantidad}) del producto ID ${producto_id} excede la cantidad comprada (${compraProducto[0].cantidad_comprada})`);
                }

                // Verificar cantidad ya devuelta anteriormente
                const [yaDevuelto] = await conn.execute(
                    `SELECT COALESCE(SUM(dd.cantidad), 0) as total_devuelto
                     FROM devoluciones_detalle dd
                     JOIN devoluciones d ON dd.devolucion_id = d.id
                     WHERE d.referencia_id = ?
                       AND dd.producto_id = ?
                       AND d.estado IN ('pendiente', 'aprobada')
                       AND d.tipo = 'compra'`,
                    [referencia_id, producto_id]
                );

                const cantidadYaDevuelta = Number(yaDevuelto[0].total_devuelto) || 0;
                const disponibleParaDevolver = compraProducto[0].cantidad_comprada - cantidadYaDevuelta;

                if (cantidad > disponibleParaDevolver) {
                    throw new Error(`Solo quedan ${disponibleParaDevolver} unidades disponibles para devolver del producto ID ${producto_id}`);
                }

                const subtotal = cantidad * compraProducto[0].precio_compra;
                totalDevuelto += subtotal;

                // Insertar detalle
                await conn.execute(
                    `INSERT INTO devoluciones_detalle (devolucion_id, producto_id, cantidad, precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [devolucionId, producto_id, cantidad, compraProducto[0].precio_compra, subtotal]
                );
            }

            // Actualizar total devuelto
            await conn.execute(
                'UPDATE devoluciones SET total_devuelto = ? WHERE id = ?',
                [totalDevuelto, devolucionId]
            );

            await conn.commit();
            conn.release();

            console.log(`[AUDITORIA] Devolución de compra ${codigo} creada por usuario ${usuarioId} para compra #${referencia_id}`);
            return await this.getById(devolucionId);

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async aprobar(id, usuarioId) {
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            // FIX B-4/B-5: Usar SELECT FOR UPDATE para evitar race condition y doble aprobación
            const [devolucion] = await conn.execute(
                'SELECT * FROM devoluciones WHERE id = ? AND estado = "pendiente" FOR UPDATE',
                [id]
            );

            if (devolucion.length === 0) {
                throw new Error('La devolución no existe o no está en estado pendiente');
            }

            // FIX B-4: Obtener detalles con conn.execute() dentro de la misma transacción
            const [detalles] = await conn.execute(
                'SELECT * FROM devoluciones_detalle WHERE devolucion_id = ?',
                [id]
            );

            // Procesar según el tipo
            if (devolucion[0].tipo === 'venta') {
                // Devolución de venta: sumar stock al inventario
                for (const detalle of detalles) {
                    if (devolucion[0].afecta_inventario) {
                        const [updateResult] = await conn.execute(
                            `UPDATE productos SET stock = stock + ? WHERE id = ?`,
                            [detalle.cantidad, detalle.producto_id]
                        );
                        if (updateResult.affectedRows === 0) {
                            throw new Error(`No se pudo actualizar el stock del producto ID ${detalle.producto_id}`);
                        }
                        console.log(`[AUDITORIA] Stock +${detalle.cantidad} para producto ${detalle.producto_id} por devolución ${id}`);
                    }
                }
            } else if (devolucion[0].tipo === 'compra') {
                // Devolución de compra: descontar stock
                for (const detalle of detalles) {
                    if (devolucion[0].afecta_inventario) {
                        // Verificar que hay suficiente stock antes de descontar
                        const [stockActual] = await conn.execute(
                            'SELECT stock FROM productos WHERE id = ? FOR UPDATE',
                            [detalle.producto_id]
                        );

                        if (stockActual.length === 0) {
                            throw new Error(`Producto ID ${detalle.producto_id} no encontrado`);
                        }

                        if (stockActual[0].stock < detalle.cantidad) {
                            throw new Error(`Stock insuficiente para el producto ID ${detalle.producto_id}. Stock actual: ${stockActual[0].stock}, requerido: ${detalle.cantidad}`);
                        }

                        await conn.execute(
                            `UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?`,
                            [detalle.cantidad, detalle.producto_id, detalle.cantidad]
                        );
                        console.log(`[AUDITORIA] Stock -${detalle.cantidad} para producto ${detalle.producto_id} por devolución de compra ${id}`);
                    }
                }
            }

            // Actualizar estado
            await conn.execute(
                'UPDATE devoluciones SET estado = "aprobada", updated_at = NOW() WHERE id = ?',
                [id]
            );

            await conn.commit();
            conn.release();

            console.log(`[AUDITORIA] Devolución ${id} aprobada por usuario ${usuarioId}`);
            return await this.getById(id);

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async rechazar(id, motivo, usuarioId) {
        const result = await query(
            `UPDATE devoluciones 
             SET estado = 'rechazada', motivo_detalle = CONCAT(COALESCE(motivo_detalle,''), ' | Rechazo: ', ?), updated_at = NOW() 
             WHERE id = ? AND estado = 'pendiente'`,
            [motivo, id]
        );

        if (result.affectedRows === 0) {
            throw new Error('No se puede rechazar la devolución en su estado actual');
        }

        console.log(`[AUDITORIA] Devolución ${id} rechazada por usuario ${usuarioId}: ${motivo}`);
        return await this.getById(id);
    },

    async getStats({ fecha_inicio, fecha_fin } = {}) {
        let sql = `
            SELECT 
                COUNT(*) as total_devoluciones,
                COALESCE(SUM(total_devuelto), 0) as monto_total,
                COUNT(CASE WHEN tipo = 'venta' THEN 1 END) as devoluciones_venta,
                COUNT(CASE WHEN tipo = 'compra' THEN 1 END) as devoluciones_compra,
                COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN estado = 'aprobada' THEN 1 END) as aprobadas,
                COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas
            FROM devoluciones
            WHERE 1=1
        `;
        const params = [];
        
        if (fecha_inicio) { sql += ' AND DATE(created_at) >= ?'; params.push(fecha_inicio); }
        if (fecha_fin) { sql += ' AND DATE(created_at) <= ?'; params.push(fecha_fin); }

        const stats = await query(sql, params);

        // Producto más devuelto
        const paramsProd = [];
        let filterProd = '';
        if (fecha_inicio) { filterProd += ' AND DATE(d.created_at) >= ?'; paramsProd.push(fecha_inicio); }
        if (fecha_fin) { filterProd += ' AND DATE(d.created_at) <= ?'; paramsProd.push(fecha_fin); }

        const productoMasDevuelto = await query(`
            SELECT p.nombre, COUNT(*) as veces_devuelto, SUM(dd.cantidad) as total_unidades
            FROM devoluciones_detalle dd
            JOIN devoluciones d ON dd.devolucion_id = d.id
            JOIN productos p ON dd.producto_id = p.id
            WHERE d.estado = 'aprobada'
            ${filterProd}
            GROUP BY p.id, p.nombre
            ORDER BY veces_devuelto DESC
            LIMIT 1
        `, paramsProd);

        const motivosComunes = await query(`
            SELECT motivo, COUNT(*) as cantidad
            FROM devoluciones
            WHERE 1=1
            ${fecha_inicio ? 'AND DATE(created_at) >= ?' : ''}
            ${fecha_fin ? 'AND DATE(created_at) <= ?' : ''}
            GROUP BY motivo
            ORDER BY cantidad DESC
        `, params);

        return {
            ...stats[0],
            producto_mas_devuelto: productoMasDevuelto[0] || null,
            motivos_comunes: motivosComunes
        };
    }
};

module.exports = devolucionesService;
