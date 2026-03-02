const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración del storage en disco
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determinar carpeta según el tipo de upload
        const folder = req.uploadFolder || 'general';
        const dir = path.join(__dirname, '../../uploads', folder);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Nombre: timestamp + random + extensión original
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, name);
    }
});

// Validación de tipos permitidos
const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 3 * 1024 * 1024 } // 3MB máximo
});

module.exports = upload;
