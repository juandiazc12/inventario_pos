/**
 * Script para ejecutar la migración de Google Tokens
 * Ejecuta: node database/run-google-migration.js
 */

const { query, getConnection } = require('../src/config/database');

async function runMigration() {
    const conn = await getConnection();
    
    try {
        console.log('🔄 Ejecutando migración: crear tabla google_tokens...\n');
        
        // Verificar si la tabla ya existe
        const [tables] = await conn.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'google_tokens'
        `, [process.env.DB_NAME || 'inventario_db']);
        
        if (tables.length > 0) {
            console.log('⚠️  La tabla google_tokens ya existe.');
            console.log('✅ Migración no necesaria.\n');
            return;
        }
        
        // Crear tabla
        console.log('📝 Creando tabla google_tokens...');
        await conn.execute(`
            CREATE TABLE google_tokens (
              id INT AUTO_INCREMENT PRIMARY KEY,
              usuario_id INT NOT NULL,
              access_token TEXT NOT NULL,
              refresh_token TEXT,
              expiry_date DATETIME,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY unique_usuario (usuario_id),
              FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Tabla google_tokens creada exitosamente.');
        
        console.log('\n✅ Migración completada exitosamente!');
        console.log('   La tabla google_tokens está lista para almacenar tokens de Google OAuth2.\n');
        
    } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠️  La tabla google_tokens ya existe.');
            console.log('✅ Migración no necesaria.\n');
        } else {
            console.error('❌ Error ejecutando migración:', err.message);
            console.error('   Código:', err.code);
            throw err;
        }
    } finally {
        conn.release();
        process.exit(0);
    }
}

runMigration().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
