const { query } = require('../../config/database');

const svc = {
    async getAll() {
        return await query('SELECT c.*, COUNT(p.id) as total_productos FROM categorias c LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = TRUE GROUP BY c.id ORDER BY c.nombre');
    },
    async create(data) {
        const { nombre, descripcion } = data;
        const result = await query('INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion || null]);
        const rows = await query('SELECT * FROM categorias WHERE id = ?', [result.insertId]);
        return rows[0];
    },
    async update(id, data) {
        const { nombre, descripcion } = data;
        await query('UPDATE categorias SET nombre=?, descripcion=? WHERE id=?', [nombre, descripcion || null, id]);
        const rows = await query('SELECT * FROM categorias WHERE id = ?', [id]);
        return rows[0];
    },
    async remove(id) {
        const prods = await query('SELECT COUNT(*) as total FROM productos WHERE categoria_id = ? AND activo = TRUE', [id]);
        if (prods[0].total > 0) {
            const err = new Error('No se puede eliminar: la categoría tiene productos asociados');
            err.status = 409;
            throw err;
        }
        await query('DELETE FROM categorias WHERE id = ?', [id]);
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await svc.getAll()); } catch (e) { next(e); } },
    async create(req, res, next) { try { res.status(201).json(await svc.create(req.body)); } catch (e) { if (e.status) return res.status(e.status).json({ error: true, message: e.message }); next(e); } },
    async update(req, res, next) { try { res.json(await svc.update(req.params.id, req.body)); } catch (e) { next(e); } },
    async remove(req, res, next) { try { await svc.remove(req.params.id); res.json({ message: 'Categoría eliminada' }); } catch (e) { if (e.status) return res.status(e.status).json({ error: true, message: e.message }); next(e); } }
};

module.exports = ctrl;
