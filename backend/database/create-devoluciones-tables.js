/**
 * Script para crear las tablas faltantes (devoluciones y relacionadas)
 * Ejecuta: node database/create-devoluciones-tables.js
 */

const { query, getConnection } = require('../src/config/database');

async function createDevolucionesTables() {
    const conn = await getConnection();
    
    try {
        console.log('🔄 Creando tablas de devoluciones...\n');
        
        // Crear tabla devoluciones si no existe
        console.log('📝 Creando tabla devoluciones...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS devoluciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo VARCHAR(20) UNIQUE NOT NULL,
                tipo ENUM('venta','compra') NOT NULL,
                referencia_id INT NOT NULL,
                usuario_id INT NOT NULL,
                motivo ENUM(
                    'producto_defectuoso',
                    'producto_equivocado',
                    'no_deseado',
                    'exceso_de_pedido',
                    'mal_estado',
                    'otro'
                ) NOT NULL,
                motivo_detalle TEXT,
                estado ENUM('pendiente','aprobada','rechazada') DEFAULT 'pendiente',
                tipo_reembolso ENUM('efectivo','credito','cambio') DEFAULT 'efectivo',
                total_devuelto DECIMAL(10,2) DEFAULT 0,
                afecta_inventario BOOLEAN DEFAULT TRUE,
                notas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        `);
        console.log('✅ Tabla devoluciones creada.');
        
        // Crear tabla devoluciones_detalle si no existe
        console.log('📝 Creando tabla devoluciones_detalle...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS devoluciones_detalle (
                id INT AUTO_INCREMENT PRIMARY KEY,
                devolucion_id INT NOT NULL,
                producto_id INT NOT NULL,
                cantidad INT NOT NULL,
                precio_unitario DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (devolucion_id) REFERENCES devoluciones(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            )
        `);
        console.log('✅ Tabla devoluciones_detalle creada.');
        
        console.log('\n✅ Migración completada exitosamente!');
        console.log('   Tablas de devoluciones creadas y listas para usar.\n');
        
    } catch (err) {
        console.error('❌ Error ejecutando migración:', err.message);
        console.error('   Código:', err.code);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

createDevolucionesTables().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
