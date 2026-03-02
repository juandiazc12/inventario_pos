const { query, getConnection } = require('../../config/database');

const trasladosService = {
    async buscarProductos(q) {
        return await query(
            `SELECT id, nombre, codigo, stock, precio_venta
             FROM productos
             WHERE activo = TRUE AND (nombre LIKE ? OR codigo LIKE ? OR codigo = ?)
             ORDER BY nombre
             LIMIT 20`,
            [`%${q}%`, `%${q}%`, q]
        );
    },

    async getAll({ estado, fecha_inicio, fecha_fin, ubicacion_origen_id, ubicacion_destino_id } = {}) {
        let sql = `
            SELECT t.*, 
                   uo.nombre as ubicacion_origen_nombre,
                   ud.nombre as ubicacion_destino_nombre,
                   us.nombre as solicitado_por_nombre,
                   ua.nombre as atendido_por_nombre,
                   (SELECT COUNT(*) FROM traslados_detalle td WHERE td.traslado_id = t.id) as total_items
            FROM traslados t
            JOIN ubicaciones uo ON t.ubicacion_origen_id = uo.id
            JOIN ubicaciones ud ON t.ubicacion_destino_id = ud.id
            LEFT JOIN usuarios us ON t.solicitado_por = us.id
            LEFT JOIN usuarios ua ON t.atendido_por = ua.id
            WHERE 1=1
        `;
        const params = [];

        if (estado) { sql += ' AND t.estado = ?'; params.push(estado); }
        if (fecha_inicio) { sql += ' AND DATE(t.fecha_solicitud) >= ?'; params.push(fecha_inicio); }
        if (fecha_fin) { sql += ' AND DATE(t.fecha_solicitud) <= ?'; params.push(fecha_fin); }
        if (ubicacion_origen_id) { sql += ' AND t.ubicacion_origen_id = ?'; params.push(ubicacion_origen_id); }
        if (ubicacion_destino_id) { sql += ' AND t.ubicacion_destino_id = ?'; params.push(ubicacion_destino_id); }

        sql += ' ORDER BY t.fecha_solicitud DESC';
        return await query(sql, params);
    },

    async getById(id) {
        const traslado = await query(
            `SELECT t.*, 
                    uo.nombre as ubicacion_origen_nombre,
                    ud.nombre as ubicacion_destino_nombre,
                    us.nombre as solicitado_por_nombre,
                    ua.nombre as atendido_por_nombre
             FROM traslados t
             JOIN ubicaciones uo ON t.ubicacion_origen_id = uo.id
             JOIN ubicaciones ud ON t.ubicacion_destino_id = ud.id
             LEFT JOIN usuarios us ON t.solicitado_por = us.id
             LEFT JOIN usuarios ua ON t.atendido_por = ua.id
             WHERE t.id = ?`,
            [id]
        );

        if (traslado.length === 0) return null;

        const detalle = await query(
            `SELECT td.*, p.nombre as producto_nombre, p.codigo as producto_codigo
             FROM traslados_detalle td
             JOIN productos p ON td.producto_id = p.id
             WHERE td.traslado_id = ?`,
            [id]
        );

        return {
            ...traslado[0],
            detalle
        };
    },

    async generarCodigo() {
        const result = await query(
            'SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)), 0) as ultimo FROM traslados WHERE codigo LIKE "TRA-%"'
        );
        const siguiente = result[0].ultimo + 1;
        return `TRA-${String(siguiente).padStart(4, '0')}`;
    },

    async create(data, usuarioId) {
        const { ubicacion_origen_id, ubicacion_destino_id, productos, notas } = data;
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            // Validar que origen y destino sean diferentes
            if (String(ubicacion_origen_id) === String(ubicacion_destino_id)) {
                throw new Error('La ubicación de origen y destino deben ser diferentes');
            }

            // Validar que las ubicaciones existen
            const [origenExiste] = await conn.execute(
                'SELECT id, nombre FROM ubicaciones WHERE id = ? AND activo = TRUE',
                [ubicacion_origen_id]
            );
            if (origenExiste.length === 0) {
                throw new Error('La ubicación de origen no existe o está inactiva');
            }

            const [destinoExiste] = await conn.execute(
                'SELECT id, nombre FROM ubicaciones WHERE id = ? AND activo = TRUE',
                [ubicacion_destino_id]
            );
            if (destinoExiste.length === 0) {
                throw new Error('La ubicación de destino no existe o está inactiva');
            }

            // Validar que se enviaron productos
            if (!productos || productos.length === 0) {
                throw new Error('Debe incluir al menos un producto en el traslado');
            }

            // Generar código
            const codigo = await this.generarCodigo();

            // Insertar traslado
            const [result] = await conn.execute(
                `INSERT INTO traslados (codigo, ubicacion_origen_id, ubicacion_destino_id, solicitado_por, notas)
                 VALUES (?, ?, ?, ?, ?)`,
                [codigo, ubicacion_origen_id, ubicacion_destino_id, usuarioId, notas || null]
            );

            const trasladoId = result.insertId;

            // Insertar detalles y validar stock
            for (const item of productos) {
                const { producto_id, cantidad_solicitada } = item;

                if (!cantidad_solicitada || cantidad_solicitada <= 0) {
                    throw new Error(`La cantidad solicitada para el producto ID ${producto_id} debe ser mayor a 0`);
                }

                // Verificar stock en origen (con FOR UPDATE para evitar race conditions)
                const [stock] = await conn.execute(
                    `SELECT stock FROM inventario_por_ubicacion 
                     WHERE producto_id = ? AND ubicacion_id = ? FOR UPDATE`,
                    [producto_id, ubicacion_origen_id]
                );

                // Si no existe registro, verificar stock global del producto como fallback
                if (stock.length === 0) {
                    const [stockGlobal] = await conn.execute(
                        'SELECT stock FROM productos WHERE id = ? FOR UPDATE',
                        [producto_id]
                    );
                    if (stockGlobal.length === 0) {
                        throw new Error(`El producto ID ${producto_id} no existe`);
                    }
                    if (stockGlobal[0].stock < cantidad_solicitada) {
                        throw new Error(`Stock insuficiente para el producto ID ${producto_id}. Stock global: ${stockGlobal[0].stock}, solicitado: ${cantidad_solicitada}`);
                    }
                } else if (stock[0].stock < cantidad_solicitada) {
                    throw new Error(`Stock insuficiente para el producto ID ${producto_id} en la ubicación de origen. Stock: ${stock[0].stock}, solicitado: ${cantidad_solicitada}`);
                }

                // Insertar detalle
                await conn.execute(
                    `INSERT INTO traslados_detalle (traslado_id, producto_id, cantidad_solicitada)
                     VALUES (?, ?, ?)`,
                    [trasladoId, producto_id, cantidad_solicitada]
                );
            }

            await conn.commit();
            conn.release();

            console.log(`[AUDITORIA] Traslado ${codigo} creado por usuario ${usuarioId}: ${origenExiste[0].nombre} → ${destinoExiste[0].nombre}`);
            return await this.getById(trasladoId);

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async despachar(id, data, usuarioId) {
        const { productos } = data;
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            // Verificar que el traslado esté en estado pendiente (FOR UPDATE previene race condition)
            const [traslado] = await conn.execute(
                'SELECT * FROM traslados WHERE id = ? AND estado = "pendiente" FOR UPDATE',
                [id]
            );

            if (traslado.length === 0) {
                throw new Error('El traslado no existe o no está en estado pendiente');
            }

            // Actualizar cantidades enviadas y validar stock nuevamente
            for (const item of productos) {
                const { producto_id, cantidad_enviada } = item;

                if (cantidad_enviada < 0) {
                    throw new Error(`La cantidad enviada para el producto ID ${producto_id} no puede ser negativa`);
                }

                if (cantidad_enviada === 0) continue; // Permitir 0 (producto no enviado parcialmente)

                // Verificar stock actual con bloqueo y fallback al stock global si no hay registro
                let stockDisponible = 0;
                const [stock] = await conn.execute(
                    `SELECT stock FROM inventario_por_ubicacion 
                     WHERE producto_id = ? AND ubicacion_id = ? FOR UPDATE`,
                    [producto_id, traslado[0].ubicacion_origen_id]
                );

                if (stock.length > 0) {
                    stockDisponible = stock[0].stock;
                } else {
                    const [stockGlobal] = await conn.execute(
                        'SELECT stock FROM productos WHERE id = ? FOR UPDATE',
                        [producto_id]
                    );
                    if (stockGlobal.length > 0) {
                        stockDisponible = stockGlobal[0].stock;
                        await conn.execute(
                            'INSERT INTO inventario_por_ubicacion (producto_id, ubicacion_id, stock) VALUES (?, ?, ?)',
                            [producto_id, traslado[0].ubicacion_origen_id, stockDisponible]
                        );
                    }
                }

                if (stockDisponible < cantidad_enviada) {
                    throw new Error(`Stock insuficiente para el producto ID ${producto_id}. Disponible: ${stockDisponible}, a enviar: ${cantidad_enviada}`);
                }

                // Actualizar detalle
                await conn.execute(
                    `UPDATE traslados_detalle 
                     SET cantidad_enviada = ? 
                     WHERE traslado_id = ? AND producto_id = ?`,
                    [cantidad_enviada, id, producto_id]
                );
            }

            // Actualizar estado del traslado a 'despachado'
            await conn.execute(
                `UPDATE traslados 
                 SET estado = 'despachado', atendido_por = ?, fecha_despacho = NOW()
                 WHERE id = ?`,
                [usuarioId, id]
            );

            await conn.commit();
            conn.release();

            console.log(`[AUDITORIA] Traslado ${id} despachado por usuario ${usuarioId}`);
            return await this.getById(id);

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async recibir(id, usuarioId) {
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            // Verificar que el traslado esté despachado (FOR UPDATE previene doble recepción)
            const [traslado] = await conn.execute(
                'SELECT * FROM traslados WHERE id = ? AND estado = "despachado" FOR UPDATE',
                [id]
            );

            if (traslado.length === 0) {
                throw new Error('El traslado no existe o no está en estado despachado');
            }

            // FIX T-2: Obtener detalles con conn.execute() DENTRO de la transacción
            const [detalles] = await conn.execute(
                'SELECT * FROM traslados_detalle WHERE traslado_id = ?',
                [id]
            );

            // Mover stock: descontar de origen, sumar en destino
            for (const detalle of detalles) {
                const { producto_id, cantidad_enviada } = detalle;

                if (!cantidad_enviada || cantidad_enviada <= 0) continue;

                // FIX T-3: Verificar stock antes de descontar para evitar stock negativo, con fallback global
                let disponible = 0;
                const [stockOrigen] = await conn.execute(
                    `SELECT stock FROM inventario_por_ubicacion 
                     WHERE producto_id = ? AND ubicacion_id = ? FOR UPDATE`,
                    [producto_id, traslado[0].ubicacion_origen_id]
                );

                if (stockOrigen.length > 0) {
                    disponible = stockOrigen[0].stock;
                } else {
                    const [globalStock] = await conn.execute(
                        'SELECT stock FROM productos WHERE id = ? FOR UPDATE', [producto_id]
                    );
                    if (globalStock.length > 0) {
                        disponible = globalStock[0].stock;
                        await conn.execute(
                            'INSERT INTO inventario_por_ubicacion (producto_id, ubicacion_id, stock) VALUES (?, ?, ?)',
                            [producto_id, traslado[0].ubicacion_origen_id, disponible]
                        );
                    }
                }

                if (disponible < cantidad_enviada) {
                    throw new Error(`Stock insuficiente en origen para el producto ID ${producto_id}. Disponible: ${disponible}, requerido: ${cantidad_enviada}`);
                }

                // Descontar de origen: UPDATE con guardia para evitar negativos
                const [updateOrigen] = await conn.execute(
                    `UPDATE inventario_por_ubicacion 
                     SET stock = stock - ? 
                     WHERE producto_id = ? AND ubicacion_id = ? AND stock >= ?`,
                    [cantidad_enviada, producto_id, traslado[0].ubicacion_origen_id, cantidad_enviada]
                );

                if (updateOrigen.affectedRows === 0) {
                    throw new Error(`No se pudo descontar stock del origen para producto ID ${producto_id}. Posible condición de carrera detectada.`);
                }

                // Sumar en destino (crear registro si no existe — ON DUPLICATE KEY)
                await conn.execute(
                    `INSERT INTO inventario_por_ubicacion (producto_id, ubicacion_id, stock)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE stock = stock + ?`,
                    [producto_id, traslado[0].ubicacion_destino_id, cantidad_enviada, cantidad_enviada]
                );

                // Sincronizar stock global del producto
                await conn.execute(
                    `UPDATE productos SET stock = (
                        SELECT COALESCE(SUM(ipu.stock), 0)
                        FROM inventario_por_ubicacion ipu
                        WHERE ipu.producto_id = ?
                     ) WHERE id = ?`,
                    [producto_id, producto_id]
                );

                console.log(`[AUDITORIA] Traslado ${id}: producto ${producto_id} movido ${cantidad_enviada} uds de ubicación ${traslado[0].ubicacion_origen_id} → ${traslado[0].ubicacion_destino_id}`);
            }

            // Actualizar estado del traslado a 'recibido'
            await conn.execute(
                `UPDATE traslados 
                 SET estado = 'recibido', fecha_recepcion = NOW()
                 WHERE id = ?`,
                [id]
            );

            await conn.commit();
            conn.release();

            console.log(`[AUDITORIA] Traslado ${id} recibido por usuario ${usuarioId}`);
            return await this.getById(id);

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async cancelar(id, usuarioId) {
        const conn = await getConnection();

        try {
            await conn.beginTransaction();

            // Verificar estado actual antes de cancelar
            const [traslado] = await conn.execute(
                'SELECT * FROM traslados WHERE id = ? FOR UPDATE',
                [id]
            );

            if (traslado.length === 0) {
                throw new Error('El traslado no existe');
            }

            // FIX T-4: No permitir cancelar traslados recibidos ni ya cancelados
            if (!['pendiente', 'despachado'].includes(traslado[0].estado)) {
                throw new Error(`No se puede cancelar un traslado en estado "${traslado[0].estado}"`);
            }

            // Si está despachado, advertir (en esta implementación el stock se mueve al recibir,
            // así que no hay stock reservado que revertir. Si en el futuro se pre-reserva, agregar rollback aquí.)
            if (traslado[0].estado === 'despachado') {
                console.warn(`[AUDITORIA] Traslado ${id} cancelado estando despachado por usuario ${usuarioId}. Verificar manualmente el estado físico de la mercancía.`);
            }

            await conn.execute(
                `UPDATE traslados SET estado = 'cancelado' WHERE id = ?`,
                [id]
            );

            await conn.commit();
            conn.release();

            console.log(`[AUDITORIA] Traslado ${id} cancelado por usuario ${usuarioId}`);
            return await this.getById(id);

        } catch (err) {
            await conn.rollback();
            conn.release();
            throw err;
        }
    },

    async getUbicaciones() {
        return await query('SELECT * FROM ubicaciones WHERE activo = TRUE ORDER BY nombre');
    },

    // FIX T-1: Corregido destructuring incorrecto — query() retorna el resultado directamente
    async createUbicacion(data) {
        const { nombre, descripcion } = data;

        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre de la ubicación es requerido');
        }

        // query() retorna el resultado de MySQL2 directamente (no un array de dos elementos)
        const result = await query(
            'INSERT INTO ubicaciones (nombre, descripcion) VALUES (?, ?)',
            [nombre.trim(), descripcion || null]
        );

        console.log(`[AUDITORIA] Nueva ubicación creada: "${nombre}" (ID: ${result.insertId})`);
        return { id: result.insertId, nombre: nombre.trim(), descripcion: descripcion || null };
    },

    async getInventarioPorUbicacion(ubicacion_id) {
        return await query(
            `SELECT ipu.*, p.nombre as producto_nombre, p.codigo as producto_codigo, p.imagen_url
             FROM inventario_por_ubicacion ipu
             JOIN productos p ON ipu.producto_id = p.id
             WHERE ipu.ubicacion_id = ? AND p.activo = TRUE
             ORDER BY p.nombre`,
            [ubicacion_id]
        );
    }
};

module.exports = trasladosService;
