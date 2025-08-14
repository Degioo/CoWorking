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
       VALUES ($1, $2, $3, $4, 'in attesa') RETURNING id_prenotazione`,
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
        `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede, se.indirizzo AS indirizzo_sede
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
        `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede, se.indirizzo AS indirizzo_sede
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

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Mette in sospeso una prenotazione (quando l'utente interrompe il pagamento)
exports.suspendPrenotazione = async (req, res) => {
  const { id_prenotazione } = req.params;
  const id_utente = req.user.id_utente;

  if (!id_prenotazione) {
    return res.status(400).json({ error: 'ID prenotazione obbligatorio' });
  }

  try {
    // Verifica che la prenotazione appartenga all'utente
    const pre = await pool.query(
      `SELECT stato FROM Prenotazione WHERE id_prenotazione = $1 AND id_utente = $2`,
      [id_prenotazione, id_utente]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Aggiorna lo stato della prenotazione a "in sospeso"
    await pool.query(
      `UPDATE Prenotazione SET stato = 'in sospeso' WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    // Aggiorna anche il pagamento se esiste
    await pool.query(
      `UPDATE Pagamento SET stato = 'in sospeso' WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    res.json({
      message: 'Prenotazione messa in sospeso',
      stato: 'in sospeso'
    });

  } catch (err) {
    console.error('Errore sospensione prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Conferma una prenotazione (dopo il pagamento)
exports.confirmPrenotazione = async (req, res) => {
  const { id_prenotazione } = req.params;
  const { method, payment_id } = req.body;
  const id_utente = req.user.id_utente;

  if (!id_prenotazione) {
    return res.status(400).json({ error: 'ID prenotazione obbligatorio' });
  }

  try {
    // Verifica che la prenotazione appartenga all'utente
    const pre = await pool.query(
      `SELECT stato FROM Prenotazione WHERE id_prenotazione = $1 AND id_utente = $2`,
      [id_prenotazione, id_utente]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Aggiorna lo stato della prenotazione a "confermata"
    await pool.query(
      `UPDATE Prenotazione SET stato = 'confermata', data_pagamento = NOW() WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    // Aggiorna o crea il record di pagamento
    await pool.query(
      `INSERT INTO Pagamento (id_prenotazione, importo, data_pagamento, stato, metodo, provider, provider_payment_id, currency)
       VALUES ($1, $2, NOW(), 'pagato', $3, $3, $4, 'EUR')
       ON CONFLICT (id_prenotazione) DO UPDATE SET
       stato = 'pagato', data_pagamento = NOW(), metodo = $3, provider_payment_id = $4`,
      [id_prenotazione, 30, method, payment_id] // 30€ come importo di default
    );

    res.json({
      message: 'Prenotazione confermata',
      stato: 'confermata'
    });

  } catch (err) {
    console.error('Errore conferma prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Elimina prenotazioni duplicate nella stessa data/stanza
exports.eliminateDuplicatePrenotazioni = async (req, res) => {
  const { id_spazio, data_inizio, data_fine, exclude_id } = req.body;
  const id_utente = req.user.id_utente;

  if (!id_spazio || !data_inizio || !data_fine) {
    return res.status(400).json({ error: 'Parametri mancanti' });
  }

  try {
    // Trova e elimina prenotazioni duplicate (stesso spazio, stesse date, stesso utente)
    const result = await pool.query(
      `DELETE FROM Prenotazione 
       WHERE id_spazio = $1 
         AND data_inizio = $2 
         AND data_fine = $3 
         AND id_utente = $4 
         AND id_prenotazione != $5 
         AND stato IN ('in attesa', 'in sospeso')`,
      [id_spazio, data_inizio, data_fine, id_utente, exclude_id]
    );

    res.json({
      message: 'Prenotazioni duplicate eliminate',
      eliminated: result.rowCount
    });

  } catch (err) {
    console.error('Errore eliminazione duplicate:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Sincronizza lo stato delle prenotazioni con i pagamenti
exports.syncPrenotazioniWithPagamenti = async (req, res) => {
  const id_utente = req.user.id_utente;

  try {
    // Trova prenotazioni che hanno pagamenti ma non sono aggiornate
    const prenotazioniToUpdate = await pool.query(
      `SELECT p.id_prenotazione, p.stato, pg.stato as pagamento_stato
       FROM Prenotazione p
       JOIN Pagamento pg ON p.id_prenotazione = pg.id_prenotazione
       WHERE p.id_utente = $1 
         AND pg.stato = 'pagato' 
         AND p.stato != 'confermata'`,
      [id_utente]
    );

    let updated = 0;
    let cancelled = 0;

    for (const prenotazione of prenotazioniToUpdate.rows) {
      // Aggiorna la prenotazione a confermata
      await pool.query(
        `UPDATE Prenotazione SET stato = 'confermata', data_pagamento = NOW() WHERE id_prenotazione = $1`,
        [prenotazione.id_prenotazione]
      );
      updated++;

      // Trova e cancella altre prenotazioni della stessa sala nella stessa data
      const duplicateResult = await pool.query(
        `SELECT p2.id_prenotazione, p2.data_inizio, p2.data_fine, p2.id_spazio
         FROM Prenotazione p1
         JOIN Prenotazione p2 ON p1.id_spazio = p2.id_spazio
         WHERE p1.id_prenotazione = $1 
           AND p2.id_prenotazione != $1
           AND p2.stato IN ('in attesa', 'in sospeso')
           AND p2.id_utente = $2
           AND p2.data_inizio = p1.data_inizio
           AND p2.data_fine = p1.data_fine`,
        [prenotazione.id_prenotazione, id_utente]
      );

      if (duplicateResult.rowCount > 0) {
        // Cancella le prenotazioni duplicate
        await pool.query(
          `DELETE FROM Prenotazione WHERE id_prenotazione = ANY($1)`,
          [duplicateResult.rows.map(p => p.id_prenotazione)]
        );
        cancelled += duplicateResult.rowCount;
      }
    }

    res.json({
      message: 'Sincronizzazione completata',
      prenotazioni_aggiornate: updated,
      prenotazioni_duplicate_cancellate: cancelled
    });

  } catch (err) {
    console.error('Errore sincronizzazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Gestisce prenotazioni multiple stessa sala (una confermata, le altre cancellate)
exports.handleMultiplePrenotazioniSala = async (req, res) => {
  const { id_spazio, data_inizio, data_fine, id_prenotazione_confermata } = req.body;
  const id_utente = req.user.id_utente;

  if (!id_spazio || !data_inizio || !data_fine || !id_prenotazione_confermata) {
    return res.status(400).json({ error: 'Parametri mancanti' });
  }

  try {
    // Trova tutte le prenotazioni della stessa sala nella stessa data
    const prenotazioniSala = await pool.query(
      `SELECT id_prenotazione, stato
       FROM Prenotazione 
       WHERE id_spazio = $1 
         AND data_inizio = $2 
         AND data_fine = $3 
         AND id_utente = $4`,
      [id_spazio, data_inizio, data_fine, id_utente]
    );

    let cancelled = 0;

    for (const prenotazione of prenotazioniSala.rows) {
      if (prenotazione.id_prenotazione !== parseInt(id_prenotazione_confermata) && 
          prenotazione.stato === 'in attesa') {
        // Cancella le altre prenotazioni in attesa
        await pool.query(
          `DELETE FROM Prenotazione WHERE id_prenotazione = $1`,
          [prenotazione.id_prenotazione]
        );
        cancelled++;
      }
    }

    res.json({
      message: 'Gestione prenotazioni multiple completata',
      prenotazioni_cancellate: cancelled
    });

  } catch (err) {
    console.error('Errore gestione prenotazioni multiple:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
}; 