const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const config = require('../../config/env');

const authService = {
    async login(usuario, password, ip, userAgent) {
        // Buscar usuario
        const users = await query(
            'SELECT * FROM usuarios WHERE usuario = ? AND activo = TRUE',
            [usuario]
        );

        const logAudit = async (userId, nombre, estado) => {
            await query(
                `INSERT INTO auditoria (usuario_id, usuario_nombre, accion, modulo, detalle, estado, ip_address, user_agent)
         VALUES (?, ?, 'login', 'auth', ?, ?, ?, ?)`,
                [userId, nombre || usuario, estado === 'exito' ? 'Login exitoso' : 'Intento de login fallido', estado, ip, userAgent]
            ).catch(() => { });
        };

        if (users.length === 0) {
            await logAudit(null, usuario, 'error');
            const err = new Error('Usuario o contraseña incorrectos');
            err.status = 401;
            throw err;
        }

        const user = users[0];
        const passwordOk = await bcrypt.compare(password, user.password_hash);

        if (!passwordOk) {
            await logAudit(user.id, user.nombre, 'error');
            const err = new Error('Usuario o contraseña incorrectos');
            err.status = 401;
            throw err;
        }

        // Actualizar último login
        await query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [user.id]);

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, usuario: user.usuario, rol: user.rol, nombre: user.nombre },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        await logAudit(user.id, user.nombre, 'exito');

        return {
            token,
            user: {
                id: user.id,
                usuario: user.usuario,
                nombre: user.nombre,
                rol: user.rol,
                permisos: typeof user.permisos === 'string' ? JSON.parse(user.permisos) : user.permisos
            }
        };
    },

    async getMe(userId) {
        const users = await query(
            'SELECT id, usuario, nombre, rol, permisos, avatar_url, activo, ultimo_login, created_at FROM usuarios WHERE id = ?',
            [userId]
        );
        if (users.length === 0) {
            const err = new Error('Usuario no encontrado');
            err.status = 404;
            throw err;
        }
        const user = users[0];
        if (user.permisos && typeof user.permisos === 'string') {
            user.permisos = JSON.parse(user.permisos);
        }
        return user;
    },

    async changePassword(userId, newPassword) {
        const users = await query('SELECT * FROM usuarios WHERE id = ?', [userId]);
        if (users.length === 0) {
            const err = new Error('Usuario no encontrado');
            err.status = 404;
            throw err;
        }
        const hash = await bcrypt.hash(newPassword, config.bcrypt.rounds);
        await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, userId]);
    }
};

module.exports = authService;
