const pool = require('../db');

// Verifica se uno spazio è disponibile in un intervallo
exports.checkDisponibilita = async (req, res) => {
  const { id } = req.params;
  const { data_inizio, data_fine } = req.query;
  if (!data_inizio || !data_fine) {
    return res.status(400).json({ error: 'Fornire data_inizio e data_fine' });
  }
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione
       WHERE id_spazio = $1
         AND stato = 'confermata'
         AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [id, data_inizio, data_fine]
    );
    const disponibile = result.rows[0].count === '0';
    res.json({ disponibile });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Crea una nuova prenotazione
exports.creaPrenotazione = async (req, res) => {
  const { id_spazio, data_inizio, data_fine } = req.body;
  // Prende l'ID utente dal middleware di autenticazione aggiornato
  const id_utente = req.user.id_utente;
  
  if (!id_utente || !id_spazio || !data_inizio || !data_fine) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }
  try {
    // Controllo disponibilità
    const check = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione
       WHERE id_spazio = $1
         AND stato = 'confermata'
         AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [id_spazio, data_inizio, data_fine]
    );
    if (check.rows[0].count !== '0') {
      return res.status(409).json({ error: 'Spazio non disponibile' });
    }
    // Inserimento prenotazione
    const result = await pool.query(
      `INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato)
       VALUES ($1, $2, $3, $4, 'confermata') RETURNING id_prenotazione`,
      [id_utente, id_spazio, data_inizio, data_fine]
    );
    res.status(201).json({ message: 'Prenotazione creata', id_prenotazione: result.rows[0].id_prenotazione });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Visualizza prenotazioni per utente o gestore
exports.getPrenotazioni = async (req, res) => {
  const { utente, gestore } = req.query;
  try {
    let result;
    if (utente) {
      result = await pool.query(
        `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede
         FROM Prenotazione p
         JOIN Spazio s ON p.id_spazio = s.id_spazio
         JOIN Sede se ON s.id_sede = se.id_sede
         WHERE p.id_utente = $1
         ORDER BY p.data_inizio DESC`,
        [utente]
      );
    } else if (gestore) {
      // Trova tutte le prenotazioni degli spazi delle sedi gestite dal gestore
      result = await pool.query(
        `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede
         FROM Prenotazione p
         JOIN Spazio s ON p.id_spazio = s.id_spazio
         JOIN Sede se ON s.id_sede = se.id_sede
         WHERE se.id_sede IN (
           SELECT id_sede FROM Sede WHERE id_gestore = $1
         )
         ORDER BY p.data_inizio DESC`,
        [gestore]
      );
    } else {
      return res.status(400).json({ error: 'Fornire utente o gestore' });
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Ottiene i dettagli di una singola prenotazione
exports.getPrenotazioneById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede, 
              u.nome AS nome_utente, u.cognome AS cognome_utente, u.email AS email_utente
       FROM Prenotazione p
       JOIN Spazio s ON p.id_spazio = s.id_spazio
       JOIN Sede se ON s.id_sede = se.id_sede
       JOIN Utente u ON p.id_utente = u.id_utente
       WHERE p.id_prenotazione = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Errore recupero prenotazione:', err);
    res.status(500).json({ error: 'Errore server' });
  }
}; 