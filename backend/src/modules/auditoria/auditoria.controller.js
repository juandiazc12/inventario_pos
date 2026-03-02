const { query } = require('../../config/database');

const svc = {
    async getAll({ usuario, accion, estado, fecha_inicio, fecha_fin, page = 1, limit = 50 } = {}) {
        let sql = 'SELECT * FROM auditoria WHERE 1=1';
        const params = [];
        if (usuario) { sql += ' AND usuario_nombre LIKE ?'; params.push(`%${usuario}%`); }
        if (accion) { sql += ' AND accion LIKE ?'; params.push(`%${accion}%`); }
        if (estado) { sql += ' AND estado = ?'; params.push(estado); }
        if (fecha_inicio) { sql += ' AND DATE(fecha) >= ?'; params.push(fecha_inicio); }
        if (fecha_fin) { sql += ' AND DATE(fecha) <= ?'; params.push(fecha_fin); }
        sql += ' ORDER BY fecha DESC';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;
        const rows = await query(sql, params);

        // Total count
        let countSql = 'SELECT COUNT(*) as total FROM auditoria WHERE 1=1';
        const countParams = [...params];
        // Remove LIMIT/OFFSET params
        const totalRows = await query(countSql.replace('SELECT COUNT(*) as total', 'SELECT COUNT(*) as total'), []);

        return { logs: rows, total: totalRows[0]?.total || rows.length, page: parseInt(page), limit: parseInt(limit) };
    },

    async limpiar() {
        const result = await query('DELETE FROM auditoria WHERE fecha < DATE_SUB(NOW(), INTERVAL 90 DAY)');
        return { eliminados: result.affectedRows };
    }
};

const ctrl = {
    async getAll(req, res, next) { try { res.json(await svc.getAll(req.query)); } catch (e) { next(e); } },
    async limpiar(req, res, next) { try { res.json(await svc.limpiar()); } catch (e) { next(e); } }
};

module.exports = ctrl;
