const express = require('express');
const router = express.Router();
const pagamentiController = require('../controllers/pagamentiController');

// Legacy
router.post('/pagamenti', pagamentiController.creaPagamento);
router.get('/pagamenti', pagamentiController.getPagamenti);

// Mock flow
router.post('/pagamenti/intent', pagamentiController.createIntent);
router.post('/pagamenti/:id/confirm', pagamentiController.confirmPayment);
router.post('/pagamenti/:id/refund', pagamentiController.refundPayment);

// Stripe (reale)
router.get('/pagamenti/stripe/config', pagamentiController.getStripePublicConfig);
router.post('/pagamenti/stripe/intent', pagamentiController.createCardIntent);
router.post('/pagamenti/stripe/complete', pagamentiController.completeCardPayment);
router.get('/pagamenti/stripe/status/:payment_intent_id', pagamentiController.getPaymentStatus);

module.exports = router; 