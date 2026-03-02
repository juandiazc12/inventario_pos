/**
 * Script para crear las tablas faltantes (traslados y relacionadas)
 * Ejecuta: node database/create-traslados-tables.js
 */

const { query, getConnection } = require('../src/config/database');

async function createTrasladosTables() {
    const conn = await getConnection();
    
    try {
        console.log('🔄 Creando tablas de traslados...\n');
        
        // Crear tabla ubicaciones si no existe
        console.log('📝 Verificando tabla ubicaciones...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS ubicaciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                descripcion TEXT,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabla ubicaciones verificada/creada.');
        
        // Crear tabla inventario_por_ubicacion si no existe
        console.log('📝 Verificando tabla inventario_por_ubicacion...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS inventario_por_ubicacion (
                id INT AUTO_INCREMENT PRIMARY KEY,
                producto_id INT NOT NULL,
                ubicacion_id INT NOT NULL,
                stock INT DEFAULT 0,
                stock_minimo INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (producto_id) REFERENCES productos(id),
                FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
                UNIQUE KEY unique_producto_ubicacion (producto_id, ubicacion_id)
            )
        `);
        console.log('✅ Tabla inventario_por_ubicacion verificada/creada.');
        
        // Crear tabla traslados si no existe
        console.log('📝 Creando tabla traslados...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS traslados (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(20) UNIQUE NOT NULL,
                ubicacion_origen_id INT NOT NULL,
                ubicacion_destino_id INT NOT NULL,
                solicitado_por INT NOT NULL,
                atendido_por INT,
                estado ENUM('pendiente','despachado','recibido','cancelado') DEFAULT 'pendiente',
                notas TEXT,
                fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_despacho TIMESTAMP NULL,
                fecha_recepcion TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (ubicacion_origen_id) REFERENCES ubicaciones(id),
                FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones(id),
                FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
                FOREIGN KEY (atendido_por) REFERENCES usuarios(id)
            )
        `);
        console.log('✅ Tabla traslados creada.');
        
        // Crear tabla traslados_detalle si no existe
        console.log('📝 Creando tabla traslados_detalle...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS traslados_detalle (
                id INT AUTO_INCREMENT PRIMARY KEY,
                traslado_id INT NOT NULL,
                producto_id INT NOT NULL,
                cantidad_solicitada INT NOT NULL,
                cantidad_enviada INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (traslado_id) REFERENCES traslados(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            )
        `);
        console.log('✅ Tabla traslados_detalle creada.');
        
        // Insertar ubicaciones iniciales si no existen
        console.log('📝 Verificando ubicaciones iniciales...');
        const [ubicacionesExistentes] = await conn.execute('SELECT COUNT(*) as count FROM ubicaciones');
        
        if (ubicacionesExistentes[0].count === 0) {
            await conn.execute(`
                INSERT INTO ubicaciones (nombre, descripcion) VALUES
                ('Local Principal', 'Tienda principal de venta al público'),
                ('Bodega Central', 'Almacén principal de productos'),
                ('Bodega Secundaria', 'Almacén secundario para productos de bajo movimiento')
            `);
            console.log('✅ Ubicaciones iniciales insertadas.');
        } else {
            console.log('⚠️  Las ubicaciones ya existen, omitiendo inserción.');
        }
        
        console.log('\n✅ Migración completada exitosamente!');
        console.log('   Tablas de traslados creadas y listas para usar.\n');
        
    } catch (err) {
        console.error('❌ Error ejecutando migración:', err.message);
        console.error('   Código:', err.code);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

createTrasladosTables().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
