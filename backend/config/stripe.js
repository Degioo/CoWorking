const stripe = require('stripe');

// Configurazione Stripe
const stripeConfig = {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key_here',
    webhookSecret: 'whsec_WsLhQ9QXBBUdppq2marA47aOewWctgi9'
};

// Inizializza Stripe
const stripeInstance = stripe(stripeConfig.secretKey);

module.exports = {
    stripe: stripeInstance,
    config: stripeConfig
};
