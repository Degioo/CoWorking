const express = require('express');
const router = express.Router();
const gestoreController = require('../controllers/gestoreController');
const { authenticateToken } = require('../middleware/auth');

// Elenco sedi gestite
router.get('/gestore/sedi', authenticateToken, gestoreController.getSediGestore);

// Prenotazioni di tutte le sedi/spazi gestiti
router.get('/gestore/prenotazioni', authenticateToken, gestoreController.getPrenotazioniGestore);

// Reportistica
router.get('/gestore/report', authenticateToken, gestoreController.getReportGestore);

// Blocca manualmente uno spazio
router.post('/gestore/spazi/:id/blocca', authenticateToken, gestoreController.bloccaSpazio);

module.exports = router; 