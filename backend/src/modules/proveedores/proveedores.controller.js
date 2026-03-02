const { query } = require('../../config/database');

const svc = {
    async getAll() {
        return await query('SELECT * FROM proveedores ORDER BY nombre ASC');
    },
    async getById(id) {
        const rows = await query('SELECT * FROM proveedores WHERE id = ?', [id]);
        return rows[0] || null;
    },
    async create(data) {
        const { nombre, contacto, telefono, email, direccion } = data;
        const result = await query(
            'INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
            [nombre, contacto || null, telefono || null, email || null, direccion || null]
        );
        const rows = await query('SELECT * FROM proveedores WHERE id = ?', [result.insertId]);
        return rows[0];
    },
    async update(id, data) {
        const { nombre, contacto, telefono, email, direccion } = data;
        await query('UPDATE proveedores SET nombre=?, contacto=?, telefono=?, email=?, direccion=? WHERE id=?',
            [nombre, contacto || null, telefono || null, email || null, direccion || null, id]);
        const rows = await query('SELECT * FROM proveedores WHERE id = ?', [id]);
        return rows[0];
    },
    async remove(id) {
        const compras = await query('SELECT COUNT(*) as total FROM compras WHERE proveedor_id = ?', [id]);
        if (compras[0].total > 0) {
            const err = new Error('No se puede eliminar: el proveedor tiene compras asociadas');
            err.status = 409;
            throw err;
        }
        await query('DELETE FROM proveedores WHERE id = ?', [id]);
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await svc.getAll()); } catch (e) { next(e); } },
    async getById(req, res, next) { try { const p = await svc.getById(req.params.id); if (!p) return res.status(404).json({ error: true, message: 'Proveedor no encontrado' }); res.json(p); } catch (e) { next(e); } },
    async create(req, res, next) { try { res.status(201).json(await svc.create(req.body)); } catch (e) { next(e); } },
    async update(req, res, next) { try { res.json(await svc.update(req.params.id, req.body)); } catch (e) { next(e); } },
    async remove(req, res, next) { try { await svc.remove(req.params.id); res.json({ message: 'Proveedor eliminado' }); } catch (e) { if (e.status) return res.status(e.status).json({ error: true, message: e.message }); next(e); } }
};

module.exports = ctrl;
