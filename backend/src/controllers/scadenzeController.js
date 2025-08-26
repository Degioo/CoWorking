const pool = require('../db');
const SSEController = require('./sseController');

// Gestisce le scadenze delle prenotazioni
class ScadenzeController {

  // Controlla e aggiorna le prenotazioni scadute (15 minuti senza prenotazione)
  static async checkScadenzePrenotazioni() {
    try {
      console.log('⏰ Controllo scadenze prenotazioni...');

      // Trova prenotazioni scadute usando il campo scadenza_slot
      const prenotazioniScadute = await pool.query(`
        SELECT p.id_prenotazione, p.id_spazio, p.stato, s.nome AS nome_spazio, se.nome AS nome_sede
        FROM Prenotazione p
        JOIN Spazio s ON p.id_spazio = s.id_spazio
        JOIN Sede se ON s.id_sede = se.id_sede
        WHERE p.scadenza_slot < NOW() 
        AND p.stato IN ('in attesa', 'pendente')
        AND s.stato = 'in_prenotazione'
      `);

      if (prenotazioniScadute.rows.length > 0) {
        console.log(`🔓 Trovate ${prenotazioniScadute.rows.length} prenotazioni scadute, libero gli slot`);

        for (const prenotazione of prenotazioniScadute.rows) {
          // Aggiorna la prenotazione a 'scaduta' (tranne quelle già cancellate)
          await pool.query(`
          UPDATE Prenotazione 
          SET stato = 'scaduta' 
          WHERE id_prenotazione = $1
          AND stato NOT IN ('cancellata', 'confermata')
        `, [prenotazione.id_prenotazione]);

          // NOTA: Non aggiorniamo più lo stato generale dello spazio
          // perché uno spazio può avere prenotazioni per alcuni orari ma essere disponibile per altri

          console.log(`✅ Prenotazione ${prenotazione.id_prenotazione} scaduta`);

          // Notifica tutti i client via SSE che lo slot è tornato disponibile
          try {
            // Ottieni informazioni sulla sede per le notifiche SSE
            const sedeInfo = await pool.query(
              `SELECT s.id_sede, s.id_spazio FROM Spazio s WHERE s.id_spazio = $1`,
              [prenotazione.id_spazio]
            );

            if (sedeInfo.rowCount > 0) {
              const { id_sede, id_spazio: spazioId } = sedeInfo.rows[0];

              // Notifica che lo slot è tornato disponibile
              SSEController.broadcastSlotUpdate(
                prenotazione.id_prenotazione,
                'available',
                {
                  prenotazioneId: prenotazione.id_prenotazione,
                  reason: 'slot_expired'
                }
              );

              // Aggiorna stato completo per tutti gli slot della data corrente
              const today = new Date().toISOString().split('T')[0];
              const slotsStatus = await SSEController.getSlotsStatus(id_sede, spazioId, today);
              SSEController.broadcastSlotsStatusUpdate(id_sede, spazioId, today, slotsStatus);
            }
          } catch (sseError) {
            console.warn('⚠️ Errore notifica SSE per slot liberato (non critico):', sseError);
          }
        }
      }

      return prenotazioniScadute.rows.length;

    } catch (error) {
      console.error('❌ Errore controllo scadenze prenotazioni:', error);
      throw error;
    }
  }

  // Controlla e scade i pagamenti in sospeso dopo 15 minuti
  static async checkPagamentiInSospeso() {
    try {
      console.log('⏱️ Controllo pagamenti in sospeso...');

      // Trova pagamenti in sospeso scaduti usando il campo scadenza_slot
      const pagamentiScaduti = await pool.query(`
        SELECT p.id_pagamento, p.id_prenotazione, p.data_pagamento, pr.stato as stato_prenotazione
        FROM Pagamento p
        JOIN Prenotazione pr ON p.id_prenotazione = pr.id_prenotazione
        WHERE p.stato = 'in attesa' 
        AND pr.scadenza_slot < NOW()
        AND pr.stato IN ('pendente', 'in attesa')
      `);

      if (pagamentiScaduti.rows.length > 0) {
        console.log(`⏰ Trovati ${pagamentiScaduti.rows.length} pagamenti in sospeso scaduti`);

        for (const pagamento of pagamentiScaduti.rows) {
          // Aggiorna il pagamento a 'fallito'
          await pool.query(`
            UPDATE Pagamento 
            SET stato = 'fallito' 
            WHERE id_pagamento = $1
          `, [pagamento.id_pagamento]);

          // Aggiorna la prenotazione a 'pagamento_fallito'
          await pool.query(`
            UPDATE Prenotazione 
            SET stato = 'pagamento_fallito' 
            WHERE id_prenotazione = $1
          `, [pagamento.id_prenotazione]);

          // NOTA: Non aggiorniamo più lo stato generale dello spazio
          // perché uno spazio può avere prenotazioni per alcuni orari ma essere disponibile per altri

          console.log(`💸 Pagamento ${pagamento.id_pagamento} scaduto e marcato come fallito`);
        }
      }

      return pagamentiScaduti.rows.length;

    } catch (error) {
      console.error('❌ Errore controllo pagamenti in sospeso:', error);
      throw error;
    }
  }

  // Controlla prenotazioni che stanno per scadere (entro 1 ora)
  static async checkPrenotazioniInScadenza() {
    try {
      console.log('⚠️ Controllo prenotazioni in scadenza...');

      // Trova prenotazioni che scadranno entro 1 ora
      const prenotazioniInScadenza = await pool.query(`
        SELECT p.id_prenotazione, p.scadenza_slot, p.stato, s.nome AS nome_spazio, se.nome AS nome_sede
        FROM Prenotazione p
        JOIN Spazio s ON p.id_spazio = s.id_spazio
        JOIN Sede se ON s.id_sede = se.id_sede
        WHERE p.stato IN ('in attesa', 'pendente')
        AND p.scadenza_slot BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
      `);

      if (prenotazioniInScadenza.rows.length > 0) {
        console.log(`⏰ Trovate ${prenotazioniInScadenza.rows.length} prenotazioni che scadranno entro 1 ora`);

        for (const prenotazione of prenotazioniInScadenza.rows) {
          const minutiRimanenti = Math.floor((new Date(prenotazione.scadenza_slot) - new Date()) / (1000 * 60));
          console.log(`⚠️ Prenotazione ${prenotazione.id_prenotazione} (${prenotazione.nome_spazio}) scade tra ${minutiRimanenti} minuti`);
        }
      }

      return prenotazioniInScadenza.rows.length;

    } catch (error) {
      console.error('❌ Errore controllo prenotazioni in scadenza:', error);
      throw error;
    }
  }

  // Esegue tutti i controlli di scadenza
  static async eseguiControlliScadenza() {
    try {
      console.log('🔄 Avvio controlli scadenza...');

      const [
        slotLiberati,
        pagamentiScaduti,
        prenotazioniInScadenza
      ] = await Promise.all([
        this.checkScadenzePrenotazioni(),
        this.checkPagamentiInSospeso(),
        this.checkPrenotazioniInScadenza()
      ]);

      console.log(`✅ Controlli scadenza completati:
        - Slot liberati: ${slotLiberati}
        - Pagamenti scaduti: ${pagamentiScaduti}
        - Prenotazioni in scadenza: ${prenotazioniInScadenza}`);

      return {
        slotLiberati,
        pagamentiScaduti,
        prenotazioniInScadenza
      };

    } catch (error) {
      console.error('❌ Errore esecuzione controlli scadenza:', error);
      throw error;
    }
  }

  // Ottiene le prenotazioni scadute per un utente
  static async getPrenotazioniScaduteUtente(idUtente) {
    try {
      const result = await pool.query(`
        SELECT p.*, s.nome as nome_spazio, sed.nome as nome_sede, sed.citta
        FROM Prenotazione p
        JOIN Spazio s ON p.id_spazio = s.id_spazio
        JOIN Sede sed ON s.id_sede = sed.id_sede
        WHERE p.id_utente = $1 
        AND p.stato IN ('scaduta', 'cancellata')
        ORDER BY p.data_fine DESC
      `, [idUtente]);

      return result.rows;

    } catch (error) {
      console.error('❌ Errore recupero prenotazioni scadute:', error);
      throw error;
    }
  }

  // Ottiene le prenotazioni in scadenza per un utente
  static async getPrenotazioniInScadenzaUtente(idUtente) {
    try {
      const result = await pool.query(`
        SELECT p.*, s.nome as nome_spazio, sed.nome as nome_sede, sed.citta
        FROM Prenotazione p
        JOIN Spazio s ON p.id_spazio = s.id_spazio
        JOIN Sede sed ON s.id_sede = sed.id_sede
        WHERE p.id_utente = $1 
        AND p.stato IN ('pendente', 'in attesa', 'pagamento_fallito')
        AND p.data_fine > NOW()
        ORDER BY p.data_fine ASC
      `, [idUtente]);

      return result.rows;

    } catch (error) {
      console.error('❌ Errore recupero prenotazioni in scadenza:', error);
      throw error;
    }
  }
}

module.exports = ScadenzeController;
