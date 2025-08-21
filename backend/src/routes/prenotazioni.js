const express = require('express');
const router = express.Router();
const prenotazioniController = require('../controllers/prenotazioniController');
const { authenticateToken } = require('../middleware/auth');

// Verifica disponibilità di uno spazio (pubblica - non richiede autenticazione)
router.get('/spazi/:id/disponibilita', prenotazioniController.checkDisponibilita);

// Crea una nuova prenotazione
router.post('/prenotazioni', authenticateToken, prenotazioniController.creaPrenotazione);

// Visualizza prenotazioni (per utente o gestore)
router.get('/prenotazioni', authenticateToken, prenotazioniController.getPrenotazioni);

// Ottiene i dettagli di una singola prenotazione
router.get('/prenotazioni/:id', authenticateToken, prenotazioniController.getPrenotazioneById);

// Mette in sospeso una prenotazione (quando l'utente interrompe il pagamento)
router.put('/prenotazioni/:id_prenotazione/suspend', authenticateToken, prenotazioniController.suspendPrenotazione);

// Conferma una prenotazione (dopo il pagamento)
router.put('/prenotazioni/:id_prenotazione/confirm', authenticateToken, prenotazioniController.confirmPrenotazione);

// Cancella una prenotazione (solo se in attesa)
router.delete('/prenotazioni/:id', authenticateToken, prenotazioniController.cancellaPrenotazione);

// Elimina prenotazioni duplicate nella stessa data/stanza
router.post('/prenotazioni/eliminate-duplicates', authenticateToken, prenotazioniController.eliminateDuplicatePrenotazioni);

// Sincronizza lo stato delle prenotazioni con i pagamenti
router.post('/prenotazioni/sync-with-pagamenti', authenticateToken, prenotazioniController.syncPrenotazioniWithPagamenti);

// Gestisce prenotazioni multiple stessa sala
router.post('/prenotazioni/handle-multiple-sala', authenticateToken, prenotazioniController.handleMultiplePrenotazioniSala);

module.exports = router; 