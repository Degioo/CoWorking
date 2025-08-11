const stripe = require('stripe');
const config = require('./config');

// Configurazione Stripe
const stripeConfig = {
    secretKey: config.stripe.secretKey,
    publishableKey: config.stripe.publishableKey,
    webhookSecret: config.stripe.webhookSecret
};

// Inizializza Stripe
const stripeInstance = stripe(stripeConfig.secretKey);

module.exports = {
    stripe: stripeInstance,
    config: stripeConfig
};
