const { google } = require('googleapis');
const { query } = require('../../config/database');

// Cache de configuración
let cachedConfig = null;
let oauth2Client = null;

/**
 * Obtiene la configuración de Google desde la base de datos
 */
async function getGoogleConfig() {
    if (cachedConfig) return cachedConfig;
    
    try {
        const rows = await query('SELECT google_client_id, google_client_secret, google_redirect_uri FROM configuracion WHERE id = 1');
        cachedConfig = rows[0] || {
            google_client_id: process.env.GOOGLE_CLIENT_ID || null,
            google_client_secret: process.env.GOOGLE_CLIENT_SECRET || null,
            google_redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback'
        };
        return cachedConfig;
    } catch (err) {
        // Si la tabla no existe o no hay configuración, usar variables de entorno
        return {
            google_client_id: process.env.GOOGLE_CLIENT_ID || null,
            google_client_secret: process.env.GOOGLE_CLIENT_SECRET || null,
            google_redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback'
        };
    }
}

/**
 * Obtiene el cliente OAuth2 configurado
 */
async function getOAuth2Client() {
    const config = await getGoogleConfig();
    
    if (!config.google_client_id || !config.google_client_secret) {
        throw new Error('Google credentials not configured. Please configure them in the Google module settings.');
    }
    
    // Si el cliente ya existe y la configuración no cambió, reutilizarlo
    if (oauth2Client && 
        oauth2Client._clientId === config.google_client_id &&
        oauth2Client._clientSecret === config.google_client_secret &&
        oauth2Client.redirectUri === config.google_redirect_uri) {
        return oauth2Client;
    }
    
    // Crear nuevo cliente
    oauth2Client = new google.auth.OAuth2(
        config.google_client_id,
        config.google_client_secret,
        config.google_redirect_uri
    );
    
    return oauth2Client;
}

/**
 * Limpia el cache de configuración (útil cuando se actualiza)
 */
function clearConfigCache() {
    cachedConfig = null;
    oauth2Client = null;
}

module.exports = {
    getOAuth2Client,
    getGoogleConfig,
    clearConfigCache
};
