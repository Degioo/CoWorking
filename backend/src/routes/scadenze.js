const express = require('express');
const router = express.Router();
const ScadenzeController = require('../controllers/scadenzeController');
const { authenticateToken } = require('../middleware/auth');

// Route per eseguire controlli scadenza (admin/gestore)
router.post('/scadenze/check', authenticateToken, async (req, res) => {
  try {
    // Verifica che l'utente sia gestore o amministratore
    if (!['gestore', 'amministratore'].includes(req.user.ruolo)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const risultati = await ScadenzeController.eseguiControlliScadenza();
    res.json({
      message: 'Controlli scadenza completati',
      risultati
    });
    
  } catch (error) {
    console.error('Errore route controlli scadenza:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Route per ottenere prenotazioni scadute di un utente
router.get('/scadenze/prenotazioni-scadute', authenticateToken, async (req, res) => {
  try {
    const prenotazioniScadute = await ScadenzeController.getPrenotazioniScaduteUtente(req.user.id_utente);
    res.json({
      prenotazioni: prenotazioniScadute,
      count: prenotazioniScadute.length
    });
    
  } catch (error) {
    console.error('Errore route prenotazioni scadute:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Route per ottenere prenotazioni in scadenza di un utente
router.get('/scadenze/prenotazioni-in-scadenza', authenticateToken, async (req, res) => {
  try {
    const prenotazioniInScadenza = await ScadenzeController.getPrenotazioniInScadenzaUtente(req.user.id_utente);
    res.json({
      prenotazioni: prenotazioniInScadenza,
      count: prenotazioniInScadenza.length
    });
    
  } catch (error) {
    console.error('Errore route prenotazioni in scadenza:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Route per ottenere statistiche scadenze (admin/gestore)
router.get('/scadenze/stats', authenticateToken, async (req, res) => {
  try {
    // Verifica che l'utente sia gestore o amministratore
    if (!['gestore', 'amministratore'].includes(req.user.ruolo)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    // Esegui controlli senza aggiornare il database
    const prenotazioniScadute = await ScadenzeController.checkScadenzePrenotazioni();
    const pagamentiScaduti = await ScadenzeController.checkPagamentiInSospeso();
    const prenotazioniInScadenza = await ScadenzeController.checkPrenotazioniInScadenza();
    
    res.json({
      stats: {
        prenotazioniScadute,
        pagamentiScaduti,
        prenotazioniInScadenza: prenotazioniInScadenza.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Errore route stats scadenze:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
