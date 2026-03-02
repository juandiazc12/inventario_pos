const { query } = require('../../config/database');

const svc = {
    async getAll() {
        const insumos = await query(
            `SELECT i.*, p.nombre as proveedor_nombre, u.nombre as usuario_nombre
             FROM insumos i
             LEFT JOIN proveedores p ON i.proveedor_id = p.id
             LEFT JOIN usuarios u ON i.usuario_id = u.id
             ORDER BY i.nombre ASC`
        );
        const total = await query('SELECT COALESCE(SUM(cantidad * precio_unitario), 0) as total_invertido FROM insumos');
        return { insumos, total_invertido: total[0].total_invertido };
    },
    async create(data, usuarioId) {
        const { nombre, categoria, cantidad, unidad, precio_unitario, proveedor_id, stock_minimo } = data;
        const result = await query(
            'INSERT INTO insumos (nombre, categoria, cantidad, unidad, precio_unitario, proveedor_id, usuario_id, stock_minimo, fecha_ultimo_ingreso) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [nombre, categoria || null, cantidad || 0, unidad || null, precio_unitario || 0, proveedor_id || null, usuarioId || null, stock_minimo || 0]
        );
        const rows = await query('SELECT * FROM insumos WHERE id = ?', [result.insertId]);
        return rows[0];
    },
    async update(id, data) {
        const { nombre, categoria, cantidad, unidad, precio_unitario, proveedor_id, stock_minimo } = data;
        await query(
            'UPDATE insumos SET nombre=?, categoria=?, cantidad=?, unidad=?, precio_unitario=?, proveedor_id=?, stock_minimo=?, fecha_ultimo_ingreso=NOW() WHERE id=?',
            [nombre, categoria || null, cantidad || 0, unidad || null, precio_unitario || 0, proveedor_id || null, stock_minimo || 0, id]
        );
        const rows = await query('SELECT * FROM insumos WHERE id = ?', [id]);
        return rows[0];
    },
    async remove(id) {
        await query('DELETE FROM insumos WHERE id = ?', [id]);
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await svc.getAll()); } catch (e) { next(e); } },
    async create(req, res, next) { try { res.status(201).json(await svc.create(req.body, req.user?.id)); } catch (e) { next(e); } },
    async update(req, res, next) { try { res.json(await svc.update(req.params.id, req.body)); } catch (e) { next(e); } },
    async remove(req, res, next) { try { await svc.remove(req.params.id); res.json({ message: 'Insumo eliminado' }); } catch (e) { next(e); } }
};

module.exports = ctrl;
