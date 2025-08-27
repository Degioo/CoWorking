// Test configurazione Stripe
require('dotenv').config();
const { stripe, config } = require('./config/stripe');

console.log('=== Test Configurazione Stripe ===\n');

// Verifica configurazione
console.log('Configurazione Stripe:');
console.log('- Secret Key presente:', !!config.secretKey);
console.log('- Publishable Key presente:', !!config.publishableKey);
console.log('- Webhook Secret presente:', !!config.webhookSecret);
console.log('- Stripe instance:', !!stripe);

// Test connessione Stripe
if (stripe) {
    console.log('\nTest connessione Stripe...');

    stripe.customers.list({ limit: 1 })
        .then(customers => {
            console.log('✅ Connessione Stripe OK');
            console.log(`- Numero totale clienti: ${customers.data.length}`);
        })
        .catch(error => {
            console.log('❌ Errore connessione Stripe:', error.message);
        });
} else {
    console.log('❌ Stripe non configurato');
}

// Verifica variabili ambiente
console.log('\nVariabili ambiente:');
console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Presente' : 'Mancante');
console.log('- STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? 'Presente' : 'Mancante');
console.log('- STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'Presente' : 'Mancante');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Presente' : 'Mancante');

console.log('\n=== Fine Test ===');
