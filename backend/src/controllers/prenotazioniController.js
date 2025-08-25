const pool = require('../db');

// Verifica se uno spazio è disponibile in un intervallo
exports.checkDisponibilita = async (req, res) => {
  const { id } = req.params;
  const { data_inizio, data_fine } = req.query;

  console.log('🔍 checkDisponibilita chiamata:', { id, data_inizio, data_fine });

  if (!data_inizio || !data_fine) {
    console.log('❌ Parametri mancanti:', { data_inizio, data_fine });
    return res.status(400).json({
      error: 'Fornire data_inizio e data_fine',
      received: { data_inizio, data_fine }
    });
  }

  try {
    // Verifica che le date siano valide
    const dataInizio = new Date(data_inizio);
    const dataFine = new Date(data_fine);

    if (isNaN(dataInizio.getTime()) || isNaN(dataFine.getTime())) {
      console.log('❌ Date non valide:', { data_inizio, data_fine });
      return res.status(400).json({
        error: 'Formato date non valido. Usare formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)',
        received: { data_inizio, data_fine }
      });
    }

    console.log('✅ Date valide:', { dataInizio, dataFine });

    // 1. Controlla lo stato dello spazio
    const spazioResult = await pool.query(
      `SELECT stato, ultima_prenotazione FROM Spazio WHERE id_spazio = $1`,
      [id]
    );

    if (spazioResult.rowCount === 0) {
      console.log('❌ Spazio non trovato');
      return res.status(404).json({ disponibile: false, motivo: 'Spazio non trovato' });
    }

    const spazio = spazioResult.rows[0];
    console.log('🏢 Stato spazio:', spazio);

    // Se lo spazio è occupato, non è disponibile
    if (spazio.stato === 'occupato') {
      console.log('❌ Spazio occupato');
      return res.json({ disponibile: false, motivo: 'Spazio occupato' });
    }

    // Se lo spazio è in prenotazione da meno di 15 minuti, non è disponibile
    if (spazio.stato === 'in_prenotazione' && spazio.ultima_prenotazione) {
      const minutiTrascorsi = Math.floor((Date.now() - new Date(spazio.ultima_prenotazione).getTime()) / (1000 * 60));

      if (minutiTrascorsi < 15) {
        const minutiRimanenti = 15 - minutiTrascorsi;
        console.log(`❌ Spazio in prenotazione, riprova tra ${minutiRimanenti} minuti`);
        return res.json({
          disponibile: false,
          motivo: `Spazio temporaneamente bloccato. Riprova tra ${minutiRimanenti} minuti.`,
          minutiRimanenti: minutiRimanenti
        });
      }
    }

    // 2. Controlla prenotazioni confermate sovrapposte
    const prenotazioniConfermate = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione
       WHERE id_spazio = $1
         AND stato = 'confermata'
         AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [id, dataInizio, dataFine]
    );

    if (prenotazioniConfermate.rows[0].count !== '0') {
      console.log('❌ Prenotazioni confermate sovrapposte');
      return res.json({ disponibile: false, motivo: 'Prenotazioni confermate sovrapposte' });
    }

    // 3. Controlla prenotazioni in attesa sovrapposte (che potrebbero scadere)
    const prenotazioniInAttesa = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione
       WHERE id_spazio = $1
         AND stato = 'in attesa'
         AND scadenza_slot > NOW()
         AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [id, dataInizio, dataFine]
    );

    if (prenotazioniInAttesa.rows[0].count !== '0') {
      console.log('❌ Prenotazioni in attesa sovrapposte');
      return res.json({ disponibile: false, motivo: 'Prenotazioni in attesa sovrapposte' });
    }

    console.log('✅ Spazio disponibile per l\'intervallo richiesto');
    res.json({ disponibile: true, motivo: 'Spazio disponibile' });

  } catch (err) {
    console.error('❌ Errore checkDisponibilita:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
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
    // Prima controlla se lo slot è disponibile o in prenotazione
    const checkSlot = await pool.query(
      `SELECT stato, ultima_prenotazione, utente_prenotazione 
       FROM Spazio WHERE id_spazio = $1`,
      [id_spazio]
    );

    if (checkSlot.rowCount === 0) {
      return res.status(404).json({ error: 'Spazio non trovato' });
    }

    const slot = checkSlot.rows[0];

    // Se lo slot è occupato, rifiuta
    if (slot.stato === 'occupato') {
      return res.status(409).json({ error: 'Spazio non disponibile' });
    }

    // Se lo slot è in prenotazione da meno di 15 minuti, rifiuta
    if (slot.stato === 'in_prenotazione' && slot.ultima_prenotazione) {
      const minutiTrascorsi = Math.floor((Date.now() - new Date(slot.ultima_prenotazione).getTime()) / (1000 * 60));

      if (minutiTrascorsi < 15) {
        const minutiRimanenti = 15 - minutiTrascorsi;
        return res.status(409).json({
          error: `Spazio temporaneamente bloccato. Riprova tra ${minutiRimanenti} minuti.`,
          minutiRimanenti: minutiRimanenti
        });
      }
    }

    // Controllo disponibilità per prenotazioni confermate
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

    // Blocca temporaneamente lo slot per 15 minuti
    await pool.query(
      `UPDATE Spazio 
       SET stato = 'in_prenotazione', 
           ultima_prenotazione = NOW(), 
           utente_prenotazione = $1
       WHERE id_spazio = $2`,
      [id_utente, id_spazio]
    );

    // Inserimento prenotazione con scadenza slot
    const scadenzaSlot = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti da ora

    const result = await pool.query(
      `INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato, scadenza_slot)
       VALUES ($1, $2, $3, $4, 'in attesa', $5) RETURNING id_prenotazione`,
      [id_utente, id_spazio, data_inizio, data_fine, scadenzaSlot]
    );

    // Nota: La liberazione automatica dello slot è gestita dal cron job scadenzeCron
    // che controlla ogni 5 minuti le prenotazioni scadute

    res.status(201).json({
      message: 'Prenotazione creata',
      id_prenotazione: result.rows[0].id_prenotazione,
      slot_bloccato: true,
      scadenza_slot: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

  } catch (err) {
    console.error('Errore creazione prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
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
      `SELECT stato, id_spazio FROM Prenotazione WHERE id_prenotazione = $1 AND id_utente = $2`,
      [id_prenotazione, id_utente]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Aggiorna lo stato della prenotazione a "confermata" e rimuove la scadenza slot
    await pool.query(
      `UPDATE Prenotazione SET stato = 'confermata', data_pagamento = NOW(), scadenza_slot = NULL WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    // Libera lo slot e lo marca come occupato per la data della prenotazione
    await pool.query(
      `UPDATE Spazio 
       SET stato = 'occupato', 
           ultima_prenotazione = NULL, 
           utente_prenotazione = NULL
       WHERE id_spazio = $1`,
      [pre.rows[0].id_spazio]
    );

    // Aggiorna o crea il record di pagamento - logica sicura senza ON CONFLICT
    try {
      // Prima prova ad inserire il nuovo record
      await pool.query(
        `INSERT INTO Pagamento (id_prenotazione, importo, data_pagamento, stato, metodo, provider, provider_payment_id, currency)
         VALUES ($1, $2, NOW(), 'pagato', $3, $3, $4, 'EUR')`,
        [id_prenotazione, 30, method, payment_id] // 30€ come importo di default
      );
    } catch (insertError) {
      // Se fallisce per duplicato, aggiorna il record esistente
      if (insertError.code === '23505') { // unique_violation
        await pool.query(
          `UPDATE Pagamento SET 
           stato = 'pagato', data_pagamento = NOW(), metodo = $2, provider_payment_id = $3
           WHERE id_prenotazione = $1`,
          [id_prenotazione, method, payment_id]
        );
      } else {
        // Se è un altro errore, rilancialo
        throw insertError;
      }
    }

    res.json({
      message: 'Prenotazione confermata',
      stato: 'confermata',
      slot_occupato: true
    });

  } catch (err) {
    console.error('Errore conferma prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Cancella una prenotazione (solo se in attesa e appartiene all'utente)
exports.cancellaPrenotazione = async (req, res) => {
  const { id } = req.params;
  const id_utente = req.user.id_utente;

  if (!id) {
    return res.status(400).json({ error: 'ID prenotazione obbligatorio' });
  }

  try {
    // Verifica che la prenotazione appartenga all'utente e sia cancellabile
    const pre = await pool.query(
      `SELECT stato, id_spazio FROM Prenotazione 
             WHERE id_prenotazione = $1 AND id_utente = $2`,
      [id, id_utente]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const prenotazione = pre.rows[0];

    // Solo le prenotazioni "in attesa" possono essere cancellate
    if (prenotazione.stato !== 'in attesa') {
      return res.status(400).json({
        error: 'Solo le prenotazioni in attesa possono essere cancellate'
      });
    }

    // Aggiorna la prenotazione a "cancellata"
    await pool.query(
      `UPDATE Prenotazione SET stato = 'cancellata' WHERE id_prenotazione = $1`,
      [id]
    );

    // Libera lo slot se era bloccato
    await pool.query(
      `UPDATE Spazio 
             SET stato = 'disponibile', 
                 ultima_prenotazione = NULL, 
                 utente_prenotazione = NULL
             WHERE id_spazio = $1 AND stato = 'in_prenotazione'`,
      [prenotazione.id_spazio]
    );

    console.log(`✅ Prenotazione ${id} cancellata, slot ${prenotazione.id_spazio} liberato`);

    res.json({
      message: 'Prenotazione cancellata con successo',
      stato: 'cancellata',
      slot_liberato: true
    });

  } catch (err) {
    console.error('Errore cancellazione prenotazione:', err);
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

// Recupera tutte le prenotazioni per uno spazio specifico
exports.getPrenotazioniSpazio = async (req, res) => {
  const { id } = req.params;

  try {
    // Recupera tutte le prenotazioni per lo spazio specificato
    const result = await pool.query(
      `SELECT p.id_prenotazione, p.id_utente, p.data_inizio, p.data_fine, p.stato, p.scadenza_slot,
              u.nome, u.cognome
       FROM Prenotazione p
       JOIN Utente u ON p.id_utente = u.id_utente
       WHERE p.id_spazio = $1
       ORDER BY p.data_inizio ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Errore recupero prenotazioni spazio:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
}; 