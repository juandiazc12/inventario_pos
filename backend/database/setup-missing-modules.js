/**
 * Script completo de setup para módulos faltantes
 * Crea tablas de traslados, devoluciones y actualiza permisos
 * Ejecuta: node database/setup-missing-modules.js
 */

const { query, getConnection } = require('../src/config/database');

async function setupMissingModules() {
    const conn = await getConnection();
    
    try {
        console.log('🔄 Configurando módulos faltantes...\n');
        
        // 1. Crear tablas de ubicaciones si no existen
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
        
        // 2. Crear tabla inventario_por_ubicacion si no existe
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
        
        // 3. Crear tabla traslados si no existe
        console.log('📝 Verificando tabla traslados...');
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
        console.log('✅ Tabla traslados verificada/creada.');
        
        // 4. Crear tabla traslados_detalle si no existe
        console.log('📝 Verificando tabla traslados_detalle...');
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
        console.log('✅ Tabla traslados_detalle verificada/creada.');
        
        // 5. Crear tabla devoluciones si no existe
        console.log('📝 Verificando tabla devoluciones...');
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
        console.log('✅ Tabla devoluciones verificada/creada.');
        
        // 6. Crear tabla devoluciones_detalle si no existe
        console.log('📝 Verificando tabla devoluciones_detalle...');
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
        console.log('✅ Tabla devoluciones_detalle verificada/creada.');
        
        // 7. Insertar ubicaciones iniciales si no existen
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
        
        // 8. Actualizar permisos de usuarios admin
        console.log('📝 Actualizando permisos de usuarios admin...');
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
                        console.log(`  ✅ Agregando permiso "${permiso}" a ${admin.usuario}`);
                    }
                }
                
                if (necesitaActualizacion) {
                    await conn.execute(
                        'UPDATE usuarios SET permisos = ? WHERE id = ?',
                        [JSON.stringify(permisos), admin.id]
                    );
                    actualizados++;
                    console.log(`  🔄 Permisos actualizados para ${admin.usuario}`);
                }
            }
            
            console.log(`📊 Usuarios admin procesados: ${admins.length}`);
            console.log(`🔄 Usuarios actualizados: ${actualizados}`);
        }
        
        console.log('\n✅ Configuración completada exitosamente!');
        console.log('   🗃️ Tablas creadas/verificadas: ubicaciones, inventario_por_ubicacion, traslados, traslados_detalle, devoluciones, devoluciones_detalle');
        console.log('   🔑 Permisos actualizados: google, whatsapp, traslados, devoluciones');
        console.log('   📍 Ubicaciones iniciales configuradas');
        console.log('\n🎉 El sistema está listo para usar todos los módulos!\n');
        
    } catch (err) {
        console.error('❌ Error en configuración:', err.message);
        console.error('   Código:', err.code);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

setupMissingModules().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
