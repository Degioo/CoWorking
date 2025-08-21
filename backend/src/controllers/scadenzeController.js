const pool = require('../db');

// Gestisce le scadenze delle prenotazioni
class ScadenzeController {

  // Controlla e aggiorna le prenotazioni scadute (15 minuti senza prenotazione)
  static async checkScadenzePrenotazioni() {
    try {
      console.log('⏰ Controllo scadenze prenotazioni...');

      // Trova slot che sono rimasti "in prenotazione" per più di 15 minuti
      const slotScaduti = await pool.query(`
        SELECT s.id_spazio, s.nome AS nome_spazio, se.nome AS nome_sede
        FROM Spazio s
        JOIN Sede se ON s.id_sede = se.id_sede
        WHERE s.stato = 'in_prenotazione' 
        AND s.ultima_prenotazione < NOW() - INTERVAL '15 minutes'
      `);

      if (slotScaduti.rows.length > 0) {
        console.log(`🔓 Trovati ${slotScaduti.rows.length} slot scaduti, li libero`);

        for (const slot of slotScaduti.rows) {
          // Libera lo slot
          await pool.query(`
            UPDATE Spazio 
            SET stato = 'disponibile', ultima_prenotazione = NULL
            WHERE id_spazio = $1
          `, [slot.id_spazio]);

          console.log(`✅ Slot ${slot.nome_spazio} (${slot.nome_sede}) liberato`);
        }
      }

      return slotScaduti.rows.length;

    } catch (error) {
      console.error('❌ Errore controllo scadenze prenotazioni:', error);
      throw error;
    }
  }

  // Controlla e scade i pagamenti in sospeso dopo 15 minuti
  static async checkPagamentiInSospeso() {
    try {
      console.log('⏱️ Controllo pagamenti in sospeso...');

      // Trova pagamenti in sospeso da più di 15 minuti
      const pagamentiScaduti = await pool.query(`
        SELECT p.id_pagamento, p.id_prenotazione, p.data_pagamento, pr.stato as stato_prenotazione
        FROM Pagamento p
        JOIN Prenotazione pr ON p.id_prenotazione = pr.id_prenotazione
        WHERE p.stato = 'in attesa' 
        AND p.data_pagamento < NOW() - INTERVAL '15 minutes'
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

          // Libera lo slot
          await pool.query(`
            UPDATE Spazio 
            SET stato = 'disponibile', ultima_prenotazione = NULL
            WHERE id_spazio = (
              SELECT id_spazio FROM Prenotazione WHERE id_prenotazione = $1
            )
          `, [pagamento.id_prenotazione]);

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
        SELECT p.id_prenotazione, p.data_inizio, p.stato, s.nome AS nome_spazio, se.nome AS nome_sede
        FROM Prenotazione p
        JOIN Spazio s ON p.id_spazio = s.id_spazio
        JOIN Sede se ON s.id_sede = s.id_sede
        WHERE p.stato IN ('confermata', 'pagato')
        AND p.data_inizio BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
      `);

      if (prenotazioniInScadenza.rows.length > 0) {
        console.log(`⏰ Trovate ${prenotazioniInScadenza.rows.length} prenotazioni che scadranno entro 1 ora`);

        for (const prenotazione of prenotazioniInScadenza.rows) {
          console.log(`⚠️ Prenotazione ${prenotazione.id_prenotazione} (${prenotazione.nome_spazio}) scade alle ${prenotazione.data_inizio}`);
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
        AND p.stato = 'scaduta'
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
