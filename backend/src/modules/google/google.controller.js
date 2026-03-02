const { google } = require('googleapis');
const googleService = require('./google.service');
const { getGoogleConfig, clearConfigCache } = require('./google.oauth');
const configService = require('../configuracion/configuracion.service');

const ctrl = {
    /**
     * Obtiene la URL de autenticación de Google OAuth2
     */
    async getAuthUrl(req, res, next) {
        try {
            const authUrl = await googleService.getAuthUrl(String(req.user.id));
            res.json({ authUrl });
        } catch (e) {
            next(e);
        }
    },

    /**
     * Intercambia el código de autorización por tokens
     */
    async handleCallback(req, res, next) {
        try {
            const { code, state } = req.query;
            if (!code || !state) {
                return res.status(400).json({ error: true, message: 'Código y state de autorización requeridos' });
            }
            const tokens = await googleService.exchangeCodeForTokens(code, state);

            // Redirigir de vuelta a la aplicación de frontend cerrando el ciclo
            res.send(`
                <html>
                <body>
                    <script>
                        alert("Conexión con Google establecida correctamente.");
                        // Intentamos redirigir al index del frontend o cerrar si es popup
                        window.location.href = "/";
                    </script>
                </body>
                </html>
            `);
        } catch (e) {
            next(e);
        }
    },

    /**
     * Verifica si el usuario tiene tokens guardados
     */
    async checkConnection(req, res, next) {
        try {
            const hasTokens = await googleService.hasTokens(req.user.id);
            res.json({ connected: hasTokens });
        } catch (e) {
            next(e);
        }
    },

    /**
     * Desconecta la cuenta de Google
     */
    async disconnect(req, res, next) {
        try {
            await googleService.removeTokens(req.user.id);
            res.json({ success: true, message: 'Cuenta de Google desconectada' });
        } catch (e) {
            next(e);
        }
    },

    /**
     * Lista archivos de Google Drive
     */
    async listDriveFiles(req, res, next) {
        try {
            const { pageToken, pageSize = 20 } = req.query;
            const files = await googleService.listDriveFiles(req.user.id, { pageToken, pageSize: parseInt(pageSize) });
            res.json(files);
        } catch (e) {
            if (e.message.includes('No tokens')) {
                return res.status(401).json({ error: true, message: 'No hay conexión con Google. Por favor conéctate primero.' });
            }
            next(e);
        }
    },

    /**
     * Lista hojas de cálculo de Google Sheets
     */
    async listSheets(req, res, next) {
        try {
            const sheets = await googleService.listSheets(req.user.id);
            res.json(sheets);
        } catch (e) {
            if (e.message.includes('No tokens')) {
                return res.status(401).json({ error: true, message: 'No hay conexión con Google. Por favor conéctate primero.' });
            }
            next(e);
        }
    },

    /**
     * Obtiene el contenido de una hoja de cálculo específica
     */
    async getSheetData(req, res, next) {
        try {
            const { spreadsheetId } = req.params;
            const { range } = req.query;
            const data = await googleService.getSheetData(req.user.id, spreadsheetId, range);
            res.json(data);
        } catch (e) {
            if (e.message.includes('No tokens')) {
                return res.status(401).json({ error: true, message: 'No hay conexión con Google. Por favor conéctate primero.' });
            }
            next(e);
        }
    },

    /**
     * Obtiene información de un archivo de Drive
     */
    async getDriveFileInfo(req, res, next) {
        try {
            const { fileId } = req.params;
            const fileInfo = await googleService.getDriveFileInfo(req.user.id, fileId);
            res.json(fileInfo);
        } catch (e) {
            if (e.message.includes('No tokens')) {
                return res.status(401).json({ error: true, message: 'No hay conexión con Google. Por favor conéctate primero.' });
            }
            next(e);
        }
    },

    /**
     * Obtiene la configuración de credenciales de Google
     */
    async getCredentials(req, res, next) {
        try {
            const config = await getGoogleConfig();
            // No devolver el secret completo por seguridad, solo mostrar si está configurado
            res.json({
                google_client_id: config.google_client_id || '',
                google_client_secret: config.google_client_secret ? '***' + config.google_client_secret.slice(-4) : '',
                google_redirect_uri: config.google_redirect_uri || 'http://localhost:3001/api/google/callback',
                isConfigured: !!(config.google_client_id && config.google_client_secret)
            });
        } catch (e) {
            next(e);
        }
    },

    /**
     * Guarda las credenciales de Google
     */
    async saveCredentials(req, res, next) {
        try {
            const { google_client_id, google_client_secret, google_redirect_uri } = req.body;

            if (!google_client_id || !google_client_secret) {
                return res.status(400).json({ error: true, message: 'Client ID y Client Secret son requeridos' });
            }

            await configService.update({
                google_client_id: google_client_id.trim(),
                google_client_secret: google_client_secret.trim(),
                google_redirect_uri: google_redirect_uri || 'http://localhost:3001/api/google/callback'
            });

            // Limpiar cache para que use las nuevas credenciales
            clearConfigCache();

            res.json({ success: true, message: 'Credenciales de Google guardadas correctamente' });
        } catch (e) {
            next(e);
        }
    },

    /**
     * Lista correos de Gmail
     */
    async listEmails(req, res, next) {
        try {
            const { pageToken, pageSize = 20, query } = req.query;
            const emails = await googleService.listEmails(req.user.id, {
                pageToken,
                pageSize: parseInt(pageSize),
                query
            });
            res.json(emails);
        } catch (e) {
            if (e.message.includes('No tokens')) {
                return res.status(401).json({ error: true, message: 'No hay conexión con Google. Por favor conéctate primero.' });
            }
            next(e);
        }
    },

    /**
     * Obtiene detalles de un correo específico
     */
    async getEmailDetail(req, res, next) {
        try {
            const { messageId } = req.params;
            const emailDetail = await googleService.getEmailDetail(req.user.id, messageId);
            res.json(emailDetail);
        } catch (e) {
            if (e.message.includes('No tokens')) {
                return res.status(401).json({ error: true, message: 'No hay conexión con Google. Por favor conéctate primero.' });
            }
            next(e);
        }
    }
};

module.exports = ctrl;
