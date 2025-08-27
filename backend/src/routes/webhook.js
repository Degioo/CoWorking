const express = require('express');
const router = express.Router();
const { stripe, config } = require('../../config/stripe');
const db = require('../db');

// Middleware per gestire il body raw per i webhook
router.use(express.raw({ type: 'application/json' }));

router.post('/', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = config.webhookSecret;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Webhook event received:', event.type);

    try {
        // Gestire i diversi tipi di eventi
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailure(event.data.object);
                break;

            case 'charge.refunded':
                await handleRefund(event.data.object);
                break;

            case 'customer.created':
                await handleCustomerCreated(event.data.object);
                break;

            case 'customer.updated':
                await handleCustomerUpdated(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Gestione pagamento completato
async function handlePaymentSuccess(paymentIntent) {
    try {
        const { metadata } = paymentIntent;

        if (metadata.prenotazione_id) {
            // Aggiorna lo stato della prenotazione
            await db.query(
                'UPDATE Prenotazione SET stato = $1, data_pagamento = NOW() WHERE id = $2',
                ['confermata', metadata.prenotazione_id]
            );

            console.log(`Prenotazione ${metadata.prenotazione_id} confermata dopo pagamento`);
        }

        // Aggiorna la tabella pagamenti se esiste
        await db.query(
            'INSERT INTO Pagamento (stripe_payment_intent_id, importo, stato, data_pagamento, utente_id) VALUES ($1, $2, $3, NOW(), $4) ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET stato = $3, data_pagamento = NOW()',
            [paymentIntent.id, paymentIntent.amount / 100, 'completato', metadata.utente_id || null]
        );

    } catch (error) {
        console.error('Error handling payment success:', error);
    }
}

// Gestione pagamento fallito
async function handlePaymentFailure(paymentIntent) {
    try {
        const { metadata } = paymentIntent;

        if (metadata.prenotazione_id) {
            // Aggiorna lo stato della prenotazione
            await db.query(
                'UPDATE Prenotazione SET stato = $1 WHERE id = $2',
                ['pagamento_fallito', metadata.prenotazione_id]
            );

            console.log(`Prenotazione ${metadata.prenotazione_id} - pagamento fallito`);
        }

        // Aggiorna la tabella pagamenti
        await db.query(
            'INSERT INTO Pagamento (stripe_payment_intent_id, importo, stato, data_pagamento, utente_id) VALUES ($1, $2, $3, NOW(), $4) ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET stato = $3, data_pagamento = NOW()',
            [paymentIntent.id, paymentIntent.amount / 100, 'fallito', metadata.utente_id || null]
        );

    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
}

// Gestione rimborso
async function handleRefund(charge) {
    try {
        const { payment_intent } = charge;

        // Aggiorna lo stato del pagamento
        await db.query(
            'UPDATE Pagamento SET stato = $1 WHERE stripe_payment_intent_id = $2',
            ['rimborsato', payment_intent]
        );

        console.log(`Pagamento ${payment_intent} rimborsato`);

    } catch (error) {
        console.error('Error handling refund:', error);
    }
}

// Gestione cliente creato
async function handleCustomerCreated(customer) {
    try {
        console.log(`Nuovo cliente Stripe creato: ${customer.id}`);
        // Qui puoi aggiungere logica per sincronizzare con il tuo database utenti
    } catch (error) {
        console.error('Error handling customer created:', error);
    }
}

// Gestione cliente aggiornato
async function handleCustomerUpdated(customer) {
    try {
        console.log(`Cliente Stripe aggiornato: ${customer.id}`);
        // Qui puoi aggiungere logica per sincronizzare con il tuo database utenti
    } catch (error) {
        console.error('Error handling customer updated:', error);
    }
}

module.exports = router;
