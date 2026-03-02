const { google } = require('googleapis');
const { query } = require('../../config/database');
const { getOAuth2Client } = require('./google.oauth');

const service = {
    /**
     * Obtiene la URL de autenticación OAuth2
    /**
     * Obtiene la URL de autenticación OAuth2
     */
    async getAuthUrl(userId) {
        const oauth2Client = await getOAuth2Client();
        const scopes = [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/gmail.readonly'
        ];
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: userId // Pasamos el ID del usuario como estado para recuperarlo en el callback
        });
        return authUrl;
    },

    /**
     * Intercambia código por tokens y los guarda
     */
    async exchangeCodeForTokens(code, userId) {
        const oauth2Client = await getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Guardar tokens en la base de datos
        await query(
            `INSERT INTO google_tokens (usuario_id, access_token, refresh_token, expiry_date) 
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             access_token = VALUES(access_token),
             refresh_token = VALUES(refresh_token),
             expiry_date = VALUES(expiry_date),
             updated_at = NOW()`,
            [
                userId,
                tokens.access_token,
                tokens.refresh_token || null,
                tokens.expiry_date ? new Date(tokens.expiry_date) : null
            ]
        );

        return tokens;
    },

    /**
     * Verifica si el usuario tiene tokens guardados
     */
    async hasTokens(userId) {
        const rows = await query(
            'SELECT id FROM google_tokens WHERE usuario_id = ?',
            [userId]
        );
        return rows.length > 0;
    },

    /**
     * Obtiene y configura los tokens del usuario
     */
    async getAuthenticatedClient(userId) {
        const oauth2Client = await getOAuth2Client();
        const rows = await query(
            'SELECT access_token, refresh_token, expiry_date FROM google_tokens WHERE usuario_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            throw new Error('No tokens found. Please connect your Google account first.');
        }

        const tokens = {
            access_token: rows[0].access_token,
            refresh_token: rows[0].refresh_token,
            expiry_date: rows[0].expiry_date ? new Date(rows[0].expiry_date).getTime() : null
        };

        oauth2Client.setCredentials(tokens);

        // Si el token expiró y hay refresh_token, renovarlo
        if (tokens.expiry_date && Date.now() >= tokens.expiry_date && tokens.refresh_token) {
            try {
                const oauth2Client = await getOAuth2Client();
                oauth2Client.setCredentials(tokens);
                const { credentials } = await oauth2Client.refreshAccessToken();
                // Actualizar tokens en la base de datos
                await query(
                    `UPDATE google_tokens SET 
                     access_token = ?,
                     expiry_date = ?,
                     updated_at = NOW()
                     WHERE usuario_id = ?`,
                    [
                        credentials.access_token,
                        credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                        userId
                    ]
                );
                // Actualizar tokens en memoria
                tokens.access_token = credentials.access_token;
                tokens.expiry_date = credentials.expiry_date;
                oauth2Client.setCredentials(credentials);
            } catch (err) {
                throw new Error('Token expired and refresh failed. Please reconnect.');
            }
        }

        return oauth2Client;
    },

    /**
     * Elimina los tokens del usuario
     */
    async removeTokens(userId) {
        await query('DELETE FROM google_tokens WHERE usuario_id = ?', [userId]);
    },

    /**
     * Lista archivos de Google Drive
     */
    async listDriveFiles(userId, options = {}) {
        const auth = await this.getAuthenticatedClient(userId);
        const drive = google.drive({ version: 'v3', auth });

        const params = {
            pageSize: options.pageSize || 20,
            fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)',
            q: "trashed=false",
            orderBy: 'modifiedTime desc'
        };

        if (options.pageToken) {
            params.pageToken = options.pageToken;
        }

        const response = await drive.files.list(params);

        return {
            files: response.data.files.map(file => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: file.size ? parseInt(file.size) : null,
                modifiedTime: file.modifiedTime,
                webViewLink: file.webViewLink,
                iconLink: file.iconLink,
                isSheet: file.mimeType === 'application/vnd.google-apps.spreadsheet'
            })),
            nextPageToken: response.data.nextPageToken
        };
    },

    /**
     * Lista hojas de cálculo (solo archivos de tipo spreadsheet)
     */
    async listSheets(userId) {
        const auth = await this.getAuthenticatedClient(userId);
        const drive = google.drive({ version: 'v3', auth });

        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            pageSize: 100,
            fields: 'files(id, name, modifiedTime, webViewLink, iconLink)',
            orderBy: 'modifiedTime desc'
        });

        return {
            sheets: response.data.files.map(file => ({
                id: file.id,
                name: file.name,
                modifiedTime: file.modifiedTime,
                webViewLink: file.webViewLink,
                iconLink: file.iconLink
            }))
        };
    },

    /**
     * Obtiene datos de una hoja de cálculo específica
     */
    async getSheetData(userId, spreadsheetId, range = null) {
        const auth = await this.getAuthenticatedClient(userId);
        const sheets = google.sheets({ version: 'v4', auth });

        // Si no se especifica rango, obtener información de las hojas
        if (!range) {
            const metadata = await sheets.spreadsheets.get({
                spreadsheetId
            });

            const sheetNames = metadata.data.sheets.map(sheet => sheet.properties.title);

            // Obtener datos de la primera hoja como ejemplo
            if (sheetNames.length > 0) {
                const firstSheet = sheetNames[0];
                const data = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${firstSheet}!A1:Z1000` // Limitar a 1000 filas
                });

                return {
                    spreadsheetId,
                    title: metadata.data.properties.title,
                    sheets: sheetNames,
                    currentSheet: firstSheet,
                    values: data.data.values || [],
                    rowCount: data.data.values ? data.data.values.length : 0
                };
            }

            return {
                spreadsheetId,
                title: metadata.data.properties.title,
                sheets: sheetNames,
                values: [],
                rowCount: 0
            };
        }

        // Obtener datos del rango específico
        const data = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range
        });

        return {
            spreadsheetId,
            range,
            values: data.data.values || [],
            rowCount: data.data.values ? data.data.values.length : 0
        };
    },

    /**
     * Obtiene información de un archivo de Drive
     */
    async getDriveFileInfo(userId, fileId) {
        const auth = await this.getAuthenticatedClient(userId);
        const drive = google.drive({ version: 'v3', auth });

        const file = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, size, modifiedTime, createdTime, webViewLink, iconLink, owners'
        });

        return {
            id: file.data.id,
            name: file.data.name,
            mimeType: file.data.mimeType,
            size: file.data.size ? parseInt(file.data.size) : null,
            modifiedTime: file.data.modifiedTime,
            createdTime: file.data.createdTime,
            webViewLink: file.data.webViewLink,
            iconLink: file.data.iconLink,
            owners: file.data.owners ? file.data.owners.map(o => o.displayName || o.emailAddress) : []
        };
    },

    /**
     * Lista correos de Gmail
     */
    async listEmails(userId, options = {}) {
        const auth = await this.getAuthenticatedClient(userId);
        const gmail = google.gmail({ version: 'v1', auth });

        const params = {
            userId: 'me',
            maxResults: options.pageSize || 20,
            q: options.query || '',
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
        };

        if (options.pageToken) {
            params.pageToken = options.pageToken;
        }

        const response = await gmail.users.messages.list(params);

        if (!response.data.messages) {
            return {
                emails: [],
                nextPageToken: response.data.nextPageToken
            };
        }

        // Obtener detalles de cada mensaje
        const emails = [];
        for (const messageRef of response.data.messages) {
            try {
                const message = await gmail.users.messages.get({
                    userId: 'me',
                    id: messageRef.id,
                    format: 'metadata',
                    metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID']
                });

                const headers = message.data.payload.headers;
                const getHeader = (name) => {
                    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
                    return header ? header.value : '';
                };

                emails.push({
                    id: message.data.id,
                    threadId: message.data.threadId,
                    snippet: message.data.snippet,
                    from: getHeader('From'),
                    to: getHeader('To'),
                    subject: getHeader('Subject'),
                    date: parseInt(message.data.internalDate),
                    dateFormatted: new Date(parseInt(message.data.internalDate)).toLocaleString(),
                    isRead: !message.data.labelIds.includes('UNREAD'),
                    isImportant: message.data.labelIds.includes('IMPORTANT'),
                    hasAttachments: message.data.payload.parts ?
                        message.data.payload.parts.some(part => part.filename && part.filename.length > 0) : false
                });
            } catch (err) {
                console.error('Error fetching message details:', err);
            }
        }

        return {
            emails: emails.sort((a, b) => b.date - a.date),
            nextPageToken: response.data.nextPageToken
        };
    },

    /**
     * Obtiene detalles completos de un correo específico
     */
    async getEmailDetail(userId, messageId) {
        const auth = await this.getAuthenticatedClient(userId);
        const gmail = google.gmail({ version: 'v1', auth });

        const message = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
        });

        const headers = message.data.payload.headers;
        const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
        };

        // Extraer contenido del correo
        const extractContent = (part) => {
            if (part.mimeType === 'text/plain' && part.body.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.mimeType === 'text/html' && part.body.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.parts) {
                for (const subPart of part.parts) {
                    const content = extractContent(subPart);
                    if (content) return content;
                }
            }
            return '';
        };

        const content = extractContent(message.data.payload);

        // Extraer archivos adjuntos
        const attachments = [];
        const extractAttachments = (part) => {
            if (part.filename && part.filename.length > 0 && part.body.attachmentId) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size,
                    attachmentId: part.body.attachmentId
                });
            }
            if (part.parts) {
                part.parts.forEach(extractAttachments);
            }
        };
        extractAttachments(message.data.payload);

        return {
            id: message.data.id,
            threadId: message.data.threadId,
            from: getHeader('From'),
            to: getHeader('To'),
            cc: getHeader('Cc'),
            subject: getHeader('Subject'),
            date: parseInt(message.data.internalDate),
            dateFormatted: new Date(parseInt(message.data.internalDate)).toLocaleString(),
            snippet: message.data.snippet,
            content: content,
            isRead: !message.data.labelIds.includes('UNREAD'),
            isImportant: message.data.labelIds.includes('IMPORTANT'),
            labels: message.data.labelIds,
            attachments: attachments,
            historyId: message.data.historyId
        };
    }
};

module.exports = service;
