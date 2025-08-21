const express = require('express');
const router = express.Router();
const ScadenzeController = require('../controllers/scadenzeController');
const { authenticateToken } = require('../middleware/auth');

// Endpoint per eseguire controlli di scadenza (solo per admin/gestori)
router.post('/check', authenticateToken, async (req, res) => {
  try {
    // Verifica che l'utente sia admin o gestore
    const user = req.user;
    if (!['amministratore', 'gestore'].includes(user.ruolo)) {
      return res.status(403).json({ error: 'Accesso negato. Solo admin e gestori possono eseguire controlli di scadenza.' });
    }

    const result = await ScadenzeController.eseguiControlliScadenza();
    
    res.json({
      message: 'Controlli scadenza eseguiti con successo',
      result: result
    });

  } catch (error) {
    console.error('Errore esecuzione controlli scadenza:', error);
    res.status(500).json({ error: 'Errore server: ' + error.message });
  }
});

// Endpoint per controllare scadenze specifiche
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!['amministratore', 'gestore'].includes(user.ruolo)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const [slotLiberati, pagamentiScaduti, prenotazioniInScadenza] = await Promise.all([
      ScadenzeController.checkScadenzePrenotazioni(),
      ScadenzeController.checkPagamentiInSospeso(),
      ScadenzeController.checkPrenotazioniInScadenza()
    ]);

    res.json({
      slotLiberati,
      pagamentiScaduti,
      prenotazioniInScadenza,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore controllo status scadenze:', error);
    res.status(500).json({ error: 'Errore server: ' + error.message });
  }
});

// Endpoint per ottenere prenotazioni scadute di un utente
router.get('/prenotazioni-scadute', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const prenotazioniScadute = await ScadenzeController.getPrenotazioniScaduteUtente(user.id_utente);
    
    res.json({
      prenotazioni: prenotazioniScadute,
      count: prenotazioniScadute.length
    });
    
  } catch (error) {
    console.error('Errore route prenotazioni scadute:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Endpoint per ottenere prenotazioni in scadenza di un utente
router.get('/prenotazioni-in-scadenza', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const prenotazioniInScadenza = await ScadenzeController.getPrenotazioniInScadenzaUtente(user.id_utente);
    
    res.json({
      prenotazioni: prenotazioniInScadenza,
      count: prenotazioniInScadenza.length
    });
    
  } catch (error) {
    console.error('Errore route prenotazioni in scadenza:', error);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
