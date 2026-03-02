const perfilService = require('./perfil.service');

const perfilController = {
    getPerfil: async (req, res) => {
        try {
            const perfil = await perfilService.getPerfil(req.user.id);
            res.json(perfil);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updatePerfil: async (req, res) => {
        try {
            const perfil = await perfilService.updatePerfil(req.user.id, req.body);
            res.json({
                status: 'success',
                message: 'Perfil actualizado correctamente',
                data: perfil
            });
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    },

    changePassword: async (req, res) => {
        try {
            const { newPassword } = req.body;
            if (!newPassword) {
                return res.status(400).json({ error: 'Se requiere la nueva contraseña' });
            }

            await perfilService.changePassword(req.user.id, newPassword);
            res.json({
                status: 'success',
                message: 'Contraseña actualizada correctamente'
            });
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    },

    uploadAvatar: async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;
            await perfilService.updateAvatar(req.user.id, avatarUrl);
            res.json({ status: 'success', avatar_url: avatarUrl, message: 'Avatar actualizado' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = perfilController;
