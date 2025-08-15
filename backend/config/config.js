// Carica variabili d'ambiente
require('dotenv').config();

// Importa configurazione personalizzata
const envConfig = require('./env');

module.exports = {
    // Configurazione database
    database: {
        // Usa DATABASE_URL se disponibile (per Supabase), altrimenti fallback locale
        url: envConfig.DATABASE_URL && envConfig.DATABASE_URL !== 'null' ? envConfig.DATABASE_URL : null,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'coworkspace',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
    },

    // Configurazione server
    server: {
        port: envConfig.PORT,
        nodeEnv: envConfig.NODE_ENV
    },

    // Configurazione Stripe
    stripe: {
        secretKey: envConfig.STRIPE_SECRET_KEY,
        publishableKey: envConfig.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: envConfig.STRIPE_WEBHOOK_SECRET
    },

    // Configurazione JWT
    jwt: {
        secret: envConfig.JWT_SECRET,
        expiresIn: envConfig.JWT_EXPIRES_IN
    },

    // Configurazione CORS
    cors: {
        origin: envConfig.CORS_ORIGIN ? envConfig.CORS_ORIGIN.split(',') : [
            'http://localhost:3000', 
            'http://localhost:8000',
            'http://127.0.0.1:5500',
            'https://coworking-mio-1.onrender.com',  // Frontend su Render
            'https://coworking-mio-1-backend.onrender.com'  // Backend su Render
        ],
        credentials: true
    }
};
