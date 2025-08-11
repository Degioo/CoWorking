const express = require('express');
const router = express.Router();
const gestoreController = require('../controllers/gestoreController');

// Elenco sedi gestite
router.get('/gestore/sedi', gestoreController.getSediGestore);

// Prenotazioni di tutte le sedi/spazi gestiti
router.get('/gestore/prenotazioni', gestoreController.getPrenotazioniGestore);

// Reportistica
router.get('/gestore/report', gestoreController.getReportGestore);

// Blocca manualmente uno spazio
router.post('/gestore/spazi/:id/blocca', gestoreController.bloccaSpazio);

module.exports = router; 