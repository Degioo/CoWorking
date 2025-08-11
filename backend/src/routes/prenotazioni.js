const express = require('express');
const router = express.Router();
const prenotazioniController = require('../controllers/prenotazioniController');

// Verifica disponibilità di uno spazio
router.get('/spazi/:id/disponibilita', prenotazioniController.checkDisponibilita);

// Crea una nuova prenotazione
router.post('/prenotazioni', prenotazioniController.creaPrenotazione);

// Visualizza prenotazioni (per utente o gestore)
router.get('/prenotazioni', prenotazioniController.getPrenotazioni);

// Ottiene i dettagli di una singola prenotazione
router.get('/prenotazioni/:id', prenotazioniController.getPrenotazioneById);

module.exports = router; 