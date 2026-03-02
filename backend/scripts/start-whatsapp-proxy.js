#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor proxy de WhatsApp Web...');

// Ruta al archivo del proxy
const proxyPath = path.join(__dirname, '../src/modules/whatsapp/whatsapp-proxy.js');

// Iniciar el proceso del proxy
const proxyProcess = spawn('node', [proxyPath], {
    stdio: 'inherit',
    env: {
        WHATSAPP_PROXY_PORT: process.env.WHATSAPP_PROXY_PORT || 3003
    }
});

// Manejar eventos del proceso
proxyProcess.on('error', (error) => {
    console.error('❌ Error al iniciar el proxy:', error.message);
    process.exit(1);
});

proxyProcess.on('close', (code) => {
    console.log(`📱 Proxy de WhatsApp detenido (código: ${code})`);
    process.exit(code);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor proxy...');
    proxyProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo servidor proxy...');
    proxyProcess.kill('SIGTERM');
});

console.log('✅ Proxy de WhatsApp iniciado correctamente');
console.log('📱 Accede a: http://localhost:3003/whatsapp');
console.log('🔍 Estado: http://localhost:3003/status');
console.log('⏹️  Presiona Ctrl+C para detener');
