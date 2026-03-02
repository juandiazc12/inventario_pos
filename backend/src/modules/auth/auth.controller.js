const authService = require('./auth.service');

const authController = {
    async login(req, res, next) {
        try {
            const { usuario, password } = req.body;
            if (!usuario || !password) {
                return res.status(400).json({ error: true, message: 'Usuario y contraseña requeridos' });
            }
            const result = await authService.login(usuario, password, req.ip, req.headers['user-agent']);
            res.json(result);
        } catch (err) {
            if (err.status) return res.status(err.status).json({ error: true, message: err.message });
            next(err);
        }
    },

    async logout(req, res) {
        res.json({ message: 'Sesión cerrada correctamente' });
    },

    async getMe(req, res, next) {
        try {
            const user = await authService.getMe(req.user.id);
            res.json(user);
        } catch (err) {
            next(err);
        }
    },

    async changePassword(req, res, next) {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return res.status(400).json({ error: true, message: 'Contraseña actual y nueva requeridas' });
            }
            await authService.changePassword(req.user.id, oldPassword, newPassword);
            res.json({ message: 'Contraseña actualizada correctamente' });
        } catch (err) {
            if (err.status) return res.status(err.status).json({ error: true, message: err.message });
            next(err);
        }
    }
};

module.exports = authController;
