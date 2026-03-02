const { query } = require('../../config/database');
const bcrypt = require('bcryptjs');

const perfilService = {
    async getPerfil(userId) {
        const rows = await query(
            'SELECT id, usuario, nombre, email, telefono, rol, avatar_url, permisos, ultimo_login, created_at FROM usuarios WHERE id = ?',
            [userId]
        );
        return rows[0];
    },

    async updatePerfil(userId, data) {
        const { nombre, email, telefono } = data;

        // Validar email si se proporciona
        if (email) {
            const existing = await query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, userId]);
            if (existing.length > 0) {
                const err = new Error('El email ya está en uso por otro usuario');
                err.status = 409;
                throw err;
            }
        }

        await query(
            'UPDATE usuarios SET nombre=?, email=?, telefono=? WHERE id=?',
            [nombre, email || null, telefono || null, userId]
        );
        return await this.getPerfil(userId);
    },

    async updateAvatar(userId, avatarUrl) {
        await query('UPDATE usuarios SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
        return true;
    },

    async changePassword(userId, newPassword) {
        const rows = await query('SELECT id FROM usuarios WHERE id = ?', [userId]);
        if (rows.length === 0) throw new Error('Usuario no encontrado');


        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, userId]);

        // Registrar en auditoría (opcional si existe el módulo)
        try {
            await query(
                'INSERT INTO auditoria (usuario_id, accion, modulo, detalles) VALUES (?, ?, ?, ?)',
                [userId, 'CAMBIO_PASSWORD', 'PERFIL', 'El usuario cambió su contraseña']
            );
        } catch (e) {
            console.error('Error al registrar auditoría de cambio de password:', e.message);
        }

        return true;
    }
};

module.exports = perfilService;
