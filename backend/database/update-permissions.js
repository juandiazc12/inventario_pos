/**
 * Script para actualizar permisos del usuario admin
 * Agrega los módulos "google" y "whatsapp" a los usuarios admin existentes
 * Ejecuta: node database/update-permissions.js
 */

const { query } = require('../src/config/database');

async function updatePermissions() {
    try {
        console.log('🔄 Actualizando permisos de usuarios admin...\n');
        
        // Obtener todos los usuarios admin
        const admins = await query('SELECT id, usuario, permisos FROM usuarios WHERE rol = "admin"');
        
        if (admins.length === 0) {
            console.log('⚠️  No se encontraron usuarios admin.');
            return;
        }
        
        console.log(`📝 Se encontraron ${admins.length} usuarios admin.`);
        
        for (const admin of admins) {
            // Parsear permisos existentes
            let permisos = [];
            if (admin.permisos) {
                permisos = typeof admin.permisos === 'string' 
                    ? JSON.parse(admin.permisos) 
                    : admin.permisos;
            }
            
            // Agregar nuevos permisos si no existen
            const nuevosPermisos = ['google', 'whatsapp'];
            let actualizado = false;
            
            for (const permiso of nuevosPermisos) {
                if (!permisos.includes(permiso)) {
                    permisos.push(permiso);
                    actualizado = true;
                    console.log(`  ✅ Agregando permiso "${permiso}" a ${admin.usuario}`);
                }
            }
            
            // Actualizar en la base de datos si hubo cambios
            if (actualizado) {
                await query(
                    'UPDATE usuarios SET permisos = ? WHERE id = ?',
                    [JSON.stringify(permisos), admin.id]
                );
                console.log(`  🔄 Permisos actualizados para ${admin.usuario}`);
            } else {
                console.log(`  ⏭️  ${admin.usuario} ya tenía todos los permisos.`);
            }
        }
        
        console.log('\n✅ Actualización de permisos completada exitosamente!');
        console.log('   Los usuarios admin ahora tienen acceso a los módulos Google y WhatsApp.\n');
        
    } catch (error) {
        console.error('❌ Error actualizando permisos:', error.message);
        process.exit(1);
    }
}

updatePermissions().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
