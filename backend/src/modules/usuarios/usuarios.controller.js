const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const config = require('../../config/env');

const svc = {
    async getAll() {
        return await query('SELECT id, usuario, nombre, rol, permisos, activo, ultimo_login, created_at FROM usuarios ORDER BY nombre ASC');
    },
    async create(data) {
        const { usuario, nombre, password, rol, permisos } = data;
        const hash = await bcrypt.hash(password, config.bcrypt.rounds);
        const permisosJson = JSON.stringify(permisos || []);
        const result = await query(
            'INSERT INTO usuarios (usuario, password_hash, nombre, rol, permisos) VALUES (?, ?, ?, ?, ?)',
            [usuario, hash, nombre || null, rol || 'operador', permisosJson]
        );
        const rows = await query('SELECT id, usuario, nombre, rol, permisos, activo, created_at FROM usuarios WHERE id = ?', [result.insertId]);
        return rows[0];
    },
    async update(id, data, currentUserId) {
        const { usuario, nombre, password, rol, permisos, activo } = data;
        let hash = null;
        if (password && password.trim()) {
            hash = await bcrypt.hash(password, config.bcrypt.rounds);
        }
        const permisosJson = permisos ? JSON.stringify(permisos) : null;

        if (hash) {
            await query('UPDATE usuarios SET usuario=?, nombre=?, password_hash=?, rol=?, permisos=?, activo=? WHERE id=?',
                [usuario, nombre || null, hash, rol || 'operador', permisosJson, activo !== undefined ? activo : true, id]);
        } else {
            await query('UPDATE usuarios SET usuario=?, nombre=?, rol=?, permisos=?, activo=? WHERE id=?',
                [usuario, nombre || null, rol || 'operador', permisosJson, activo !== undefined ? activo : true, id]);
        }
        const rows = await query('SELECT id, usuario, nombre, rol, permisos, activo, created_at FROM usuarios WHERE id = ?', [id]);
        return rows[0];
    },
    async remove(id, currentUserId) {
        if (parseInt(id) === parseInt(currentUserId)) {
            const err = new Error('No puedes eliminar tu propio usuario');
            err.status = 400;
            throw err;
        }
        await query('DELETE FROM usuarios WHERE id = ?', [id]);
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await svc.getAll()); } catch (e) { next(e); } },
    async create(req, res, next) { try { res.status(201).json(await svc.create(req.body)); } catch (e) { next(e); } },
    async update(req, res, next) { try { res.json(await svc.update(req.params.id, req.body, req.user.id)); } catch (e) { if (e.status) return res.status(e.status).json({ error: true, message: e.message }); next(e); } },
    async remove(req, res, next) { try { await svc.remove(req.params.id, req.user.id); res.json({ message: 'Usuario eliminado' }); } catch (e) { if (e.status) return res.status(e.status).json({ error: true, message: e.message }); next(e); } }
};

module.exports = ctrl;
