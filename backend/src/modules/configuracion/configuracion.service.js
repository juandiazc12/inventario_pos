const { query } = require('../../config/database');

const configService = {
    // Asegurar que la tabla y columnas existan
    async init() {
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS configuracion (
                    id INT PRIMARY KEY,
                    nombre_sistema VARCHAR(255) DEFAULT 'InventarioPro',
                    moneda VARCHAR(10) DEFAULT '$',
                    logo_url TEXT,
                    google_client_id TEXT,
                    google_client_secret TEXT,
                    google_redirect_uri VARCHAR(500) DEFAULT 'http://localhost:3001/api/google/callback'
                )
            `);
            await query(`
                CREATE TABLE IF NOT EXISTS google_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario_id INT NOT NULL,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT,
                    expiry_date DATETIME,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (usuario_id)
                )
            `);
            await query('INSERT IGNORE INTO configuracion (id, nombre_sistema, moneda) VALUES (1, "InventarioPro", "$")');

            // Migración de usuarios: añadir columnas una por una manejando errores si ya existen
            const addColumn = async (table, col, definition) => {
                try {
                    await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
                } catch (e) {
                    // Ignorar error si la columna ya existe (ER_DUP_FIELDNAME)
                    if (e.errno !== 1060) console.warn(`Nota: ${e.message}`);
                }
            };

            await addColumn('usuarios', 'email', 'VARCHAR(150)');
            await addColumn('usuarios', 'telefono', 'VARCHAR(20)');
            await addColumn('usuarios', 'avatar_url', 'TEXT');

        } catch (err) {
            console.error('Error en inicialización de base de datos:', err.message);
        }
    },

    async getAll() {
        await this.init(); // Garantizar tablas
        const rows = await query('SELECT nombre_sistema, moneda, logo_url, google_client_id, google_client_secret, google_redirect_uri FROM configuracion WHERE id = 1');
        return rows[0] || {
            nombre_sistema: 'InventarioPro',
            moneda: '$',
            logo_url: null,
            google_client_id: null,
            google_client_secret: null,
            google_redirect_uri: 'http://localhost:3001/api/google/callback'
        };
    },

    async getPublicConfig() {
        await this.init();
        const rows = await query('SELECT nombre_sistema, logo_url FROM configuracion WHERE id = 1');
        return rows[0] || { nombre_sistema: 'InventarioPro', logo_url: null };
    },

    async update(data) {
        await this.init();
        const { nombre_sistema, moneda, logo_url, google_client_id, google_client_secret, google_redirect_uri } = data;
        const fields = [];
        const params = [];

        if (nombre_sistema !== undefined) { fields.push('nombre_sistema = ?'); params.push(nombre_sistema); }
        if (moneda !== undefined) { fields.push('moneda = ?'); params.push(moneda); }
        if (logo_url !== undefined) { fields.push('logo_url = ?'); params.push(logo_url); }
        if (google_client_id !== undefined) { fields.push('google_client_id = ?'); params.push(google_client_id); }
        if (google_client_secret !== undefined) { fields.push('google_client_secret = ?'); params.push(google_client_secret); }
        if (google_redirect_uri !== undefined) { fields.push('google_redirect_uri = ?'); params.push(google_redirect_uri); }

        if (fields.length === 0) return true;

        params.push(1); // ID = 1
        await query(`UPDATE configuracion SET ${fields.join(', ')} WHERE id = ?`, params);
        return true;
    }
};

module.exports = configService;
