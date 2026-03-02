/**
 * Script para ejecutar la migración de insumos
 * Ejecuta: node database/run-migration.js
 */

const { query, getConnection } = require('../src/config/database');

async function runMigration() {
    const conn = await getConnection();
    
    try {
        console.log('🔄 Ejecutando migración: agregar usuario_id a insumos...\n');
        
        // Verificar si la columna ya existe
        const [columns] = await conn.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'insumos' 
            AND COLUMN_NAME = 'usuario_id'
        `, [process.env.DB_NAME || 'inventario_db']);
        
        if (columns.length > 0) {
            console.log('⚠️  La columna usuario_id ya existe en la tabla insumos.');
            console.log('✅ Migración no necesaria.\n');
            return;
        }
        
        // Agregar columna usuario_id
        console.log('📝 Agregando columna usuario_id...');
        await conn.execute(`
            ALTER TABLE insumos 
            ADD COLUMN usuario_id INT NULL AFTER proveedor_id
        `);
        console.log('✅ Columna usuario_id agregada exitosamente.');
        
        // Verificar si la constraint ya existe
        const [constraints] = await conn.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'insumos' 
            AND CONSTRAINT_NAME = 'fk_insumos_usuario'
        `, [process.env.DB_NAME || 'inventario_db']);
        
        if (constraints.length === 0) {
            // Agregar foreign key
            console.log('📝 Agregando foreign key constraint...');
            await conn.execute(`
                ALTER TABLE insumos 
                ADD CONSTRAINT fk_insumos_usuario 
                FOREIGN KEY (usuario_id) 
                REFERENCES usuarios(id) 
                ON DELETE SET NULL
            `);
            console.log('✅ Foreign key constraint agregada exitosamente.');
        } else {
            console.log('⚠️  La constraint fk_insumos_usuario ya existe.');
        }
        
        console.log('\n✅ Migración completada exitosamente!');
        console.log('   La tabla insumos ahora tiene la columna usuario_id (responsable).\n');
        
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  La columna usuario_id ya existe en la tabla insumos.');
            console.log('✅ Migración no necesaria.\n');
        } else if (err.code === 'ER_DUP_KEYNAME') {
            console.log('⚠️  La constraint fk_insumos_usuario ya existe.');
            console.log('✅ Migración completada (constraint ya existía).\n');
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
