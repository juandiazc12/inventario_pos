/**
 * Script de inicialización completa de la base de datos
 * Crea la base de datos, todas las tablas y aplica las migraciones necesarias.
 * Ejecuta: node database/init-db.js
 */

const fs = require('fs');
const path = require('path');
const { getConnection, pool } = require('../src/config/database');

async function runSqlFile(conn, filePath) {
    console.log(`📖 Leyendo archivo: ${path.basename(filePath)}...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Dividir el SQL por punto y coma, pero teniendo cuidado con los delimitadores si los hubiera
    // En este caso, asumimos que los archivos SQL son estándar.
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (const statement of statements) {
        try {
            await conn.query(statement);
        } catch (err) {
            // Ignorar errores de "ya existe" para que el script sea re-ejecutable
            if (err.code === 'ER_TABLE_EXISTS_ERROR' ||
                err.code === 'ER_DUP_FIELDNAME' ||
                err.code === 'ER_DUP_KEYNAME' ||
                err.code === 'ER_DUP_ENTRY') {
                continue;
            }
            console.error(`❌ Error en statement: ${statement.substring(0, 100)}...`);
            console.error(`   Motivo: ${err.message}`);
        }
    }
    console.log(`✅ Archivo ${path.basename(filePath)} procesado.`);
}

async function initDatabase() {
    let conn;
    try {
        console.log('🚀 Iniciando inicialización de la base de datos...\n');

        // Obtener conexión sin especificar base de datos primero para crearla
        const tempPool = require('mysql2/promise').createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0
        });

        const dbName = process.env.DB_NAME || 'inventario_db';
        console.log(`🔨 Verificando/Creando base de datos: ${dbName}...`);
        await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await tempPool.end();

        // Ahora usar la conexión normal
        conn = await getConnection();
        await conn.query(`USE ${dbName}`);

        const dbPath = __dirname;

        // 1. Ejecutar esquema consolidado (incluye todas las tablas y migraciones)
        await runSqlFile(conn, path.join(dbPath, 'schema.sql'));

        // 3. Actualizar permisos de usuarios admin
        console.log('\n🔐 Actualizando permisos de usuarios admin...');
        const [admins] = await conn.execute(
            'SELECT id, usuario, permisos FROM usuarios WHERE rol = "admin"'
        );

        if (admins.length > 0) {
            const nuevosPermisos = ['google', 'whatsapp', 'traslados', 'devoluciones'];
            let actualizados = 0;

            for (const admin of admins) {
                let permisos = [];
                if (admin.permisos) {
                    permisos = typeof admin.permisos === 'string'
                        ? JSON.parse(admin.permisos)
                        : admin.permisos;
                }

                let necesitaActualizacion = false;
                for (const permiso of nuevosPermisos) {
                    if (!permisos.includes(permiso)) {
                        permisos.push(permiso);
                        necesitaActualizacion = true;
                    }
                }

                if (necesitaActualizacion) {
                    await conn.execute(
                        'UPDATE usuarios SET permisos = ? WHERE id = ?',
                        [JSON.stringify(permisos), admin.id]
                    );
                    actualizados++;
                    console.log(`   ✅ Permisos actualizados para: ${admin.usuario}`);
                }
            }
            console.log(`📊 Admins actualizados: ${actualizados}`);
        }

        console.log('\n✨ ¡Inicialización completada exitosamente!');
        console.log('   El sistema está listo para funcionar con todas sus tablas.\n');

    } catch (err) {
        console.error('\n❌ ERROR FATAL durante la inicialización:', err.message);
        process.exit(1);
    } finally {
        if (conn) conn.release();
        await pool.end();
        process.exit(0);
    }
}

initDatabase();
