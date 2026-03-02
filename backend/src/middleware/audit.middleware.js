const { query } = require('../config/database');

/**
 * Middleware de auditoría automática
 * Registra en la tabla `auditoria` cada POST/PUT/DELETE exitoso
 */
const auditMiddleware = async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
        // Solo registrar si es mutación y fue exitosa
        if (['POST', 'PUT', 'DELETE'].includes(req.method) && res.statusCode < 400) {
            const pathParts = req.path.split('/').filter(Boolean);
            const modulo = pathParts[0] || 'desconocido';

            const accionMap = {
                POST: 'crear',
                PUT: 'actualizar',
                DELETE: 'eliminar'
            };

            const accion = `${accionMap[req.method]}_${modulo}`;
            const usuarioId = req.user?.id || null;
            const usuarioNombre = req.user?.nombre || req.user?.usuario || 'Sistema';
            const ip = req.ip || req.connection?.remoteAddress || 'desconocida';
            const userAgent = req.headers['user-agent'] || '';

            let detalle = '';
            if (req.body && Object.keys(req.body).length > 0) {
                const bodyClean = { ...req.body };
                delete bodyClean.password;
                delete bodyClean.password_hash;
                detalle = JSON.stringify(bodyClean).substring(0, 500);
            }

            query(
                `INSERT INTO auditoria (usuario_id, usuario_nombre, accion, modulo, detalle, estado, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, 'exito', ?, ?)`,
                [usuarioId, usuarioNombre, accion, modulo, detalle, ip, userAgent]
            ).catch(err => console.error('Error en auditoría:', err.message));
        }

        return originalJson(data);
    };

    next();
};

module.exports = auditMiddleware;
