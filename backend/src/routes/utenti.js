const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/utenti - Lista utenti per sede (per gestori)
router.get('/', async (req, res) => {
  try {
    const { sede, tipo } = req.query;
    
    let query = 'SELECT u.* FROM utente u';
    let params = [];
    
    if (sede && tipo === 'responsabile') {
      // Per gestori: mostra utenti che hanno prenotazioni nella sede
      query = `
        SELECT DISTINCT u.* 
        FROM utente u
        JOIN prenotazione p ON u.id_utente = p.id_utente
        JOIN spazio s ON p.id_spazio = s.id_spazio
        WHERE s.id_sede = $1
        ORDER BY u.cognome, u.nome
      `;
      params = [sede];
    } else {
      // Per admin: mostra tutti gli utenti
      query = 'SELECT * FROM utente ORDER BY cognome, nome';
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET /api/utenti/:id - Dettagli di un utente specifico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM utente WHERE id_utente = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore nel recupero dell\'utente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;
