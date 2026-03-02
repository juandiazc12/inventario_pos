const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Middleware de autenticación JWT
 * Verifica el token del header Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    console.log('Auth header:', authHeader ? 'Presente' : 'Ausente'); // Debug
    console.log('Auth header value:', authHeader); // Debug

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Error: Token de autenticación requerido'); // Debug
        return res.status(401).json({ error: true, message: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído:', token ? 'SÍ' : 'NO'); // Debug

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        console.log('Token decodificado exitosamente:', decoded.usuario); // Debug
        req.user = {
            id: decoded.id,
            usuario: decoded.usuario,
            rol: decoded.rol,
            nombre: decoded.nombre
        };
        next();
    } catch (err) {
        console.log('Error al verificar token:', err.message); // Debug
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: true, message: 'Token expirado, inicia sesión nuevamente' });
        }
        return res.status(401).json({ error: true, message: 'Token inválido' });
    }
};

module.exports = authMiddleware;
