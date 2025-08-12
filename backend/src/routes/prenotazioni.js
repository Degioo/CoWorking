const express = require('express');
const router = express.Router();
const prenotazioniController = require('../controllers/prenotazioniController');
const { authenticateToken } = require('../middleware/auth');

// Verifica disponibilità di uno spazio
router.get('/spazi/:id/disponibilita', prenotazioniController.checkDisponibilita);

// Crea una nuova prenotazione
router.post('/prenotazioni', authenticateToken, prenotazioniController.creaPrenotazione);

// Visualizza prenotazioni (per utente o gestore)
router.get('/prenotazioni', authenticateToken, prenotazioniController.getPrenotazioni);

// Ottiene i dettagli di una singola prenotazione
router.get('/prenotazioni/:id', authenticateToken, prenotazioniController.getPrenotazioneById);

module.exports = router; 