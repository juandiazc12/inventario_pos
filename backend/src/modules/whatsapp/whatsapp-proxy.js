const express = require('express');
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.WHATSAPP_PROXY_PORT || 3003;

// Habilitar CORS
app.use(cors());

// Configuración del proxy
const whatsappProxy = createProxyMiddleware({
  target: 'https://web.whatsapp.com',
  changeOrigin: true,
  secure: true,
  ws: true,
  // Manejar la respuesta para modificar el HTML y eliminar CSP
  selfHandleResponse: true,

  onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
    // Solo interceptar si el contenido es HTML
    const contentType = proxyRes.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      const body = responseBuffer.toString('utf8');
      const $ = cheerio.load(body);

      // Eliminar meta etiquetas de seguridad
      $('meta[http-equiv="content-security-policy"]').remove();
      $('meta[content*="frame-ancestors"]').remove();
      $('meta[content*="Content-Security-Policy"]').remove();

      // Eliminar scripts que inyecten CSP
      $('script').each(function () {
        const content = $(this).html() || '';
        if (content.match(/Content-Security-Policy|frame-ancestors|CSP/i)) {
          $(this).remove();
        }
      });

      return $.html();
    }

    // Si no es HTML, devolver el buffer original
    return responseBuffer;
  }),

  onProxyReq: (proxyReq, req, res) => {
    // Evitar detección de proxy
    proxyReq.setHeader('Origin', 'https://web.whatsapp.com');
    proxyReq.setHeader('Referer', 'https://web.whatsapp.com/');
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  },

  onError: (err, req, res) => {
    console.error('❌ Error en el proxy:', err);
    res.status(500).json({ error: 'Proxy Error', message: err.message });
  }
});

// Middleware para limpiar cabeceras en todas las respuestas del proxy
app.use('/whatsapp', (req, res, next) => {
  const originalSetHeader = res.setHeader;
  res.setHeader = function (name, value) {
    const forbiddenHeaders = [
      'content-security-policy',
      'x-frame-options',
      'frame-ancestors',
      'x-content-type-options',
      'referrer-policy',
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'cross-origin-resource-policy'
    ];

    if (forbiddenHeaders.includes(name.toLowerCase())) {
      return;
    }
    return originalSetHeader.apply(this, arguments);
  };
  next();
});

// Usar el proxy
app.use('/whatsapp', whatsappProxy);

// Rutas de utilidad
app.get('/status', (req, res) => {
  res.json({ status: 'running', port: PORT, service: 'WhatsApp Proxy' });
});

app.get('/health', (req, res) => res.send('OK'));

const server = app.listen(PORT, () => {
  console.log(`🚀 Proxy de WhatsApp activo en el puerto ${PORT}`);
});

// Crucial: manejar WebSockets para el código QR
server.on('upgrade', (req, socket, head) => {
  console.log('🔄 Upgrade a WebSocket detectado');
  whatsappProxy.upgrade(req, socket, head);
});

module.exports = app;
