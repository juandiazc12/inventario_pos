/**
 * setup-admin.js
 * Ejecutar UNA VEZ para crear el usuario admin con password hasheada
 * Uso: node setup-admin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./src/config/database');

async function setupAdmin() {
  try {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    
    await query(
      `UPDATE usuarios SET password_hash = ? WHERE usuario = 'admin'`,
      [hash]
    );
    
    console.log('✅ Usuario admin configurado correctamente');
    console.log('   Usuario: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  Cambia la contraseña después del primer login!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setupAdmin();
