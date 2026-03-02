const { query } = require('../../config/database');

const svc = {
    async getAll() {
        return await query('SELECT * FROM clientes ORDER BY nombre ASC');
    },
    async getById(id) {
        const rows = await query('SELECT * FROM clientes WHERE id = ?', [id]);
        if (!rows[0]) return null;
        const historial = await query(
            `SELECT v.*, p.nombre as producto_nombre FROM ventas v JOIN productos p ON v.producto_id = p.id WHERE v.cliente_id = ? ORDER BY v.fecha DESC LIMIT 20`,
            [id]
        );
        return { ...rows[0], historial };
    },
    async create(data) {
        const { nombre, documento, telefono, email, direccion } = data;
        const result = await query(
            'INSERT INTO clientes (nombre, documento, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
            [nombre, documento || null, telefono || null, email || null, direccion || null]
        );
        const rows = await query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
        return rows[0];
    },
    async update(id, data) {
        const { nombre, documento, telefono, email, direccion } = data;
        await query('UPDATE clientes SET nombre=?, documento=?, telefono=?, email=?, direccion=? WHERE id=?',
            [nombre, documento || null, telefono || null, email || null, direccion || null, id]);
        const rows = await query('SELECT * FROM clientes WHERE id = ?', [id]);
        return rows[0];
    },
    async remove(id) {
        await query('DELETE FROM clientes WHERE id = ?', [id]);
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await svc.getAll()); } catch (e) { next(e); } },
    async getById(req, res, next) { try { const c = await svc.getById(req.params.id); if (!c) return res.status(404).json({ error: true, message: 'Cliente no encontrado' }); res.json(c); } catch (e) { next(e); } },
    async create(req, res, next) {
        try {
            res.status(201).json(await svc.create(req.body));
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: true, message: 'El documento ingresado ya está registrado para otro cliente' });
            }
            next(e);
        }
    },
    async update(req, res, next) {
        try {
            res.json(await svc.update(req.params.id, req.body));
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: true, message: 'El documento ingresado ya está registrado para otro cliente' });
            }
            next(e);
        }
    },
    async remove(req, res, next) { try { await svc.remove(req.params.id); res.json({ message: 'Cliente eliminado' }); } catch (e) { next(e); } }
};

module.exports = ctrl;
