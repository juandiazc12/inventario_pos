const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Middleware de autenticación JWT
 * Verifica el token del header Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: true, message: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = {
            id: decoded.id,
            usuario: decoded.usuario,
            rol: decoded.rol,
            nombre: decoded.nombre
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: true, message: 'Token expirado, inicia sesión nuevamente' });
        }
        return res.status(401).json({ error: true, message: 'Token inválido' });
    }
};

module.exports = authMiddleware;
