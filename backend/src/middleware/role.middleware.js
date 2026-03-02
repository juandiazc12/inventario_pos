/**
 * Middleware de control de roles
 * Uso: requireRole('admin') o requireRole('admin', 'operador')
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: true, message: 'No autenticado' });
        }
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                error: true,
                message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`
            });
        }
        next();
    };
};

module.exports = { requireRole };
