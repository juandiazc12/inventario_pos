const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const auditMiddleware = require('./middleware/audit.middleware');

const app = express();

// ─── SERVIR FRONTEND ──────────────────────────────────────────────────────────
// Esto permite abrir la app en http://localhost:3001 directamente
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../../frontend')));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://localhost:5173',
        'null' // Para abrir index.html directamente desde el sistema de archivos
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ─── PARSERS ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── RUTAS ───────────────────────────────────────────────────────────────────
app.use(auditMiddleware);

// Autenticación y perfil
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/perfil', require('./modules/perfil/perfil.routes'));

// Operaciones principales
app.use('/api/ventas', require('./modules/ventas/ventas.routes'));
app.use('/api/compras', require('./modules/compras/compras.routes'));
app.use('/api/traslados', require('./modules/traslados/traslados.routes'));
app.use('/api/devoluciones', require('./modules/devoluciones/devoluciones.routes'));
app.use('/api/pedidos', require('./modules/pedidos/pedidos.routes'));

// Catálogos
app.use('/api/productos', require('./modules/productos/productos.routes'));
app.use('/api/categorias', require('./modules/categorias/categorias.routes'));
app.use('/api/clientes', require('./modules/clientes/clientes.routes'));
app.use('/api/proveedores', require('./modules/proveedores/proveedores.routes'));
app.use('/api/insumos', require('./modules/insumos/insumos.routes'));

// Dashboard y reportes
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/resumenes', require('./modules/resumenes/resumenes.routes'));
app.use('/api/auditoria', require('./modules/auditoria/auditoria.routes'));

// Integraciones
app.use('/api/google', require('./modules/google/google.routes'));

// Configuración
app.use('/api/configuracion', require('./modules/configuracion/configuracion.routes'));
app.use('/api/usuarios', require('./modules/usuarios/usuarios.routes'));

// ─── INFO ───────────────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
    res.json({
        message: 'Bienvenido a la API de InventarioPro v2.0',
        version: '2.0.0',
        endpoints: [
            '/api/auth', '/api/perfil',
            '/api/ventas', '/api/compras', '/api/traslados', '/api/devoluciones', '/api/pedidos',
            '/api/productos', '/api/categorias', '/api/clientes', '/api/proveedores', '/api/insumos',
            '/api/dashboard', '/api/resumenes', '/api/auditoria',
            '/api/google', '/whatsapp',
            '/api/configuracion', '/api/usuarios'
        ]
    });
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── MIDDLEWARE DE ERRORES GLOBAL ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Error global:', err.message);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        error: true,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: true, message: `Ruta no encontrada: ${req.method} ${req.path}` });
});

module.exports = app;
