require('dotenv').config();

const config = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'inventario_db'
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback_secret_cambiar_en_produccion',
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    },
    server: {
        port: parseInt(process.env.PORT) || 3001,
        env: process.env.NODE_ENV || 'development'
    },
    bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS) || 10
    }
};

module.exports = config;
