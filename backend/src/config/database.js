const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inventario_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    charset: 'utf8mb4'
});

// Verificar conexión al iniciar
pool.getConnection()
    .then(conn => {
        console.log('✅ Conexión a MySQL establecida');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Error conectando a MySQL:', err.message);
        console.error('   Verifica las credenciales en el archivo .env');
    });

/**
 * Ejecuta una consulta SQL con parámetros
 * @param {string} sql - Consulta SQL
 * @param {Array} params - Parámetros para la consulta
 * @returns {Promise<Array>} Resultados
 */
async function query(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (err) {
        console.error('❌ Error en query:', err.message);
        console.error('   SQL:', sql);
        throw err;
    }
}

/**
 * Obtiene una conexión del pool para transacciones
 * @returns {Promise<Connection>} Conexión MySQL
 */
async function getConnection() {
    return await pool.getConnection();
}

module.exports = { query, getConnection, pool };
