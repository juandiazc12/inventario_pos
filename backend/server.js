require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./src/app');
const config = require('./src/config/env');

const PORT = config.server.port;

// Crear servidor HTTP
const server = http.createServer(app);

// Configurar Socket.io
const io = socketIo(server, {
    cors: {
        origin: [
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://localhost:3000',
            'http://localhost:5173',
            'null'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Hacer io disponible para las rutas
app.set('io', io);

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado a Socket.io:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado de Socket.io:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('🚀 ================================');
    console.log(`   Servidor corriendo en puerto ${PORT}`);
    console.log(`   Entorno: ${config.server.env}`);
    console.log(`   API: http://localhost:${PORT}/api`);
    console.log(`   Socket.io habilitado`);
    console.log('================================ 🚀');
    console.log('');
});
