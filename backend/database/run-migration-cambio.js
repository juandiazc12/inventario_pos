/**
 * Script para ejecutar la migración de cambio y trazabilidad
 * Ejecuta: node database/run-migration-cambio.js
 */

const { getConnection } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const conn = await getConnection();

    try {
        console.log('🔄 Ejecutando migración: Cambio y Trazabilidad...\n');

        const sqlPath = path.join(__dirname, 'migration_cambio_y_trazabilidad.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Separar comandos por punto y coma (simplificado)
        const commands = sql.split(';').filter(c => c.trim().length > 0);

        for (let cmd of commands) {
            if (cmd.trim().toUpperCase().startsWith('USE')) continue;
            try {
                await conn.execute(cmd);
                console.log('✅ Comando ejecutado con éxito.');
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_FK_DUP_NAME') {
                    console.log('⚠️  El campo o restricción ya existe. Omitiendo.');
                } else {
                    throw err;
                }
            }
        }

        console.log('\n✅ Migración completada exitosamente!');

    } catch (err) {
        console.error('❌ Error ejecutando migración:', err.message);
        process.exit(1);
    } finally {
        conn.release();
        process.exit(0);
    }
}

runMigration();
