/**
 * Migración de permisos para Google, WhatsApp, Traslados y Devoluciones
 * Agrega los módulos "google", "whatsapp", "traslados" y "devoluciones" a todos los usuarios admin
 * Ejecuta: node database/migrate-permissions-google-whatsapp.js
 */

const { query, getConnection } = require('../src/config/database');

async function migratePermissions() {
    const conn = await getConnection();
    
    try {
        console.log('🔄 Ejecutando migración: agregar permisos Google, WhatsApp, Traslados y Devoluciones...\n');
        
        // Obtener todos los usuarios admin
        const [admins] = await conn.execute(
            'SELECT id, usuario, permisos FROM usuarios WHERE rol = "admin"'
        );
        
        if (admins.length === 0) {
            console.log('⚠️  No se encontraron usuarios admin.');
            console.log('✅ Migración no necesaria.\n');
            return;
        }
        
        console.log(`📝 Se encontraron ${admins.length} usuarios admin.`);
        
        let actualizados = 0;
        
        for (const admin of admins) {
            // Parsear permisos existentes
            let permisos = [];
            if (admin.permisos) {
                permisos = typeof admin.permisos === 'string' 
                    ? JSON.parse(admin.permisos) 
                    : admin.permisos;
            }
            
            // Agregar nuevos permisos si no existen
            const nuevosPermisos = ['google', 'whatsapp', 'traslados', 'devoluciones'];
            let necesitaActualizacion = false;
            
            for (const permiso of nuevosPermisos) {
                if (!permisos.includes(permiso)) {
                    permisos.push(permiso);
                    necesitaActualizacion = true;
                    console.log(`  ✅ Agregando permiso "${permiso}" a ${admin.usuario}`);
                }
            }
            
            // Actualizar en la base de datos si hubo cambios
            if (necesitaActualizacion) {
                await conn.execute(
                    'UPDATE usuarios SET permisos = ? WHERE id = ?',
                    [JSON.stringify(permisos), admin.id]
                );
                actualizados++;
                console.log(`  🔄 Permisos actualizados para ${admin.usuario}`);
            } else {
                console.log(`  ⏭️  ${admin.usuario} ya tenía todos los permisos.`);
            }
        }
        
        console.log(`\n✅ Migración completada!`);
        console.log(`   📊 Usuarios admin procesados: ${admins.length}`);
        console.log(`   🔄 Usuarios actualizados: ${actualizados}`);
        console.log(`   🔑 Permisos agregados: "google", "whatsapp", "traslados", "devoluciones"\n`);
        
    } catch (err) {
        console.error('❌ Error ejecutando migración:', err.message);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migratePermissions().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
