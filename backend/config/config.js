require('dotenv').config();

module.exports = {
  // Configurazione database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'coworkspace',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  // Configurazione server
  server: {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  // Configurazione Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key_here',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_WsLhQ9QXBBUdppq2marA47aOewWctgi9'
  },
  
  // Configurazione JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_here',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Configurazione CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true
  }
};
