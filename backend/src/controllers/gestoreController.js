const pool = require('../db');

// Elenco sedi gestite dal gestore
exports.getSediGestore = async (req, res) => {
  const { id_gestore } = req.query;
  if (!id_gestore) return res.status(400).json({ error: 'Fornire id_gestore' });
  try {
    const result = await pool.query('SELECT * FROM Sede WHERE id_gestore = $1', [id_gestore]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Prenotazioni di tutte le sedi/spazi gestiti
exports.getPrenotazioniGestore = async (req, res) => {
  const { id_gestore } = req.query;
  if (!id_gestore) return res.status(400).json({ error: 'Fornire id_gestore' });
  try {
    const result = await pool.query(
      `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede
       FROM Prenotazione p
       JOIN Spazio s ON p.id_spazio = s.id_spazio
       JOIN Sede se ON s.id_sede = se.id_sede
       WHERE se.id_gestore = $1
       ORDER BY p.data_inizio DESC`,
      [id_gestore]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Reportistica: numero prenotazioni, incasso totale per sede/spazio, periodo selezionabile
exports.getReportGestore = async (req, res) => {
  const { id_gestore, dal, al } = req.query;
  if (!id_gestore) return res.status(400).json({ error: 'Fornire id_gestore' });
  try {
    const result = await pool.query(
      `SELECT se.id_sede, se.nome AS nome_sede, s.id_spazio, s.nome AS nome_spazio,
              COUNT(p.id_prenotazione) AS num_prenotazioni,
              COALESCE(SUM(pg.importo),0) AS incasso_totale
       FROM Sede se
       JOIN Spazio s ON se.id_sede = s.id_sede
       LEFT JOIN Prenotazione p ON s.id_spazio = p.id_spazio
         AND (p.data_inizio >= $2 OR $2 IS NULL)
         AND (p.data_fine <= $3 OR $3 IS NULL)
       LEFT JOIN Pagamento pg ON p.id_prenotazione = pg.id_prenotazione AND pg.stato = 'pagato'
       WHERE se.id_gestore = $1
       GROUP BY se.id_sede, s.id_spazio
       ORDER BY se.id_sede, s.id_spazio`,
      [id_gestore, dal || null, al || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Blocca manualmente uno spazio per un intervallo (crea una prenotazione "blocco")
exports.bloccaSpazio = async (req, res) => {
  const { id } = req.params; // id_spazio
  const { id_gestore, data_inizio, data_fine, motivo } = req.body;
  if (!id_gestore || !data_inizio || !data_fine) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }
  try {
    // Verifica che lo spazio appartenga a una sede del gestore
    const check = await pool.query(
      `SELECT s.id_spazio FROM Spazio s
       JOIN Sede se ON s.id_sede = se.id_sede
       WHERE s.id_spazio = $1 AND se.id_gestore = $2`,
      [id, id_gestore]
    );
    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Non autorizzato a bloccare questo spazio' });
    }
    // Inserisce una prenotazione "blocco" con id_utente = id_gestore per rispettare NOT NULL
    await pool.query(
      `INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato)
       VALUES ($1, $2, $3, $4, 'confermata')`,
      [id_gestore, id, data_inizio, data_fine]
    );
    res.status(201).json({ message: 'Spazio bloccato con successo' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
}; 