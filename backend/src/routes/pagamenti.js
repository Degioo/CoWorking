const express = require('express');
const router = express.Router();
const pagamentiController = require('../controllers/pagamentiController');
const { authenticateToken } = require('../middleware/auth');

// Legacy
router.post('/pagamenti', pagamentiController.creaPagamento);
router.get('/pagamenti', pagamentiController.getPagamenti);

// Mock flow
router.post('/pagamenti/intent', pagamentiController.createIntent);
router.post('/pagamenti/:id/confirm', pagamentiController.confirmPayment);
router.post('/pagamenti/:id/refund', pagamentiController.refundPayment);

// Stripe (reale)
router.get('/pagamenti/stripe/config', pagamentiController.getStripePublicConfig);
router.post('/pagamenti/stripe/intent', authenticateToken, pagamentiController.createCardIntent);
router.post('/pagamenti/stripe/complete', authenticateToken, pagamentiController.completeCardPayment);
router.get('/pagamenti/stripe/status/:payment_intent_id', authenticateToken, pagamentiController.getPaymentStatus);

// Pagamenti generici (PayPal, bonifico, crypto)
router.post('/pagamenti/confirm', authenticateToken, pagamentiController.confirmGenericPayment);

// Gestione prenotazioni in sospeso
router.put('/prenotazioni/:id_prenotazione/suspend', authenticateToken, pagamentiController.suspendPrenotazione);

module.exports = router; 