const configService = require('./configuracion.service');

const configController = {
    async getAll(req, res) {
        try {
            const config = await configService.getAll();
            res.json(config);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getPublicConfig(req, res) {
        try {
            const config = await configService.getPublicConfig();
            res.json(config);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async update(req, res) {
        try {
            const updates = req.body;
            await configService.update(updates);
            res.json({ status: 'success', message: 'Configuración actualizada' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async uploadLogo(req, res) {
        try {
            if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
            const logoUrl = `/uploads/branding/${req.file.filename}`;
            await configService.update({ logo_url: logoUrl });
            res.json({ status: 'success', logo_url: logoUrl, message: 'Logo actualizado' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = configController;
