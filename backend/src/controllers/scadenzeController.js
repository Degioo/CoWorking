const pool = require('../db');

// Gestisce le scadenze delle prenotazioni
class ScadenzeController {
  
  // Controlla e aggiorna le prenotazioni scadute
  static async checkScadenzePrenotazioni() {
    try {
      console.log('🔍 Controllo scadenze prenotazioni...');
      
      // Trova prenotazioni scadute (data_fine < NOW)
      const prenotazioniScadute = await pool.query(`
        SELECT id_prenotazione, id_utente, data_inizio, data_fine, stato
        FROM Prenotazione 
        WHERE data_fine < NOW() 
        AND stato IN ('pendente', 'in attesa', 'pagamento_fallito')
      `);
      
      if (prenotazioniScadute.rows.length > 0) {
        console.log(`📅 Trovate ${prenotazioniScadute.rows.length} prenotazioni scadute`);
        
        for (const prenotazione of prenotazioniScadute.rows) {
          // Aggiorna lo stato a 'scaduta'
          await pool.query(`
            UPDATE Prenotazione 
            SET stato = 'scaduta' 
            WHERE id_prenotazione = $1
          `, [prenotazione.id_prenotazione]);
          
          // Aggiorna anche i pagamenti associati
          await pool.query(`
            UPDATE Pagamento 
            SET stato = 'fallito' 
            WHERE id_prenotazione = $1 
            AND stato IN ('in attesa', 'in sospeso')
          `, [prenotazione.id_prenotazione]);
          
          console.log(`⏰ Prenotazione ${prenotazione.id_prenotazione} marcata come scaduta`);
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
      
      // Trova prenotazioni che scadono entro 1 ora
      const prenotazioniInScadenza = await pool.query(`
        SELECT id_prenotazione, id_utente, data_inizio, data_fine, stato
        FROM Prenotazione 
        WHERE data_fine BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
        AND stato IN ('pendente', 'in attesa', 'pagamento_fallito')
      `);
      
      if (prenotazioniInScadenza.rows.length > 0) {
        console.log(`⚠️ Trovate ${prenotazioniInScadenza.rows.length} prenotazioni in scadenza`);
        
        for (const prenotazione of prenotazioniInScadenza.rows) {
          // Calcola i minuti rimanenti
          const minutiRimanenti = Math.ceil(
            (new Date(prenotazione.data_fine) - new Date()) / (1000 * 60)
          );
          
          console.log(`⏰ Prenotazione ${prenotazione.id_prenotazione} scade in ${minutiRimanenti} minuti`);
        }
      }
      
      return prenotazioniInScadenza.rows;
      
    } catch (error) {
      console.error('❌ Errore controllo prenotazioni in scadenza:', error);
      throw error;
    }
  }
  
  // Esegue tutti i controlli di scadenza
  static async eseguiControlliScadenza() {
    try {
      console.log('🔄 Avvio controlli scadenza completi...');
      
      const prenotazioniScadute = await this.checkScadenzePrenotazioni();
      const pagamentiScaduti = await this.checkPagamentiInSospeso();
      const prenotazioniInScadenza = await this.checkPrenotazioniInScadenza();
      
      console.log('✅ Controlli scadenza completati:');
      console.log(`   - Prenotazioni scadute: ${prenotazioniScadute}`);
      console.log(`   - Pagamenti scaduti: ${pagamentiScaduti}`);
      console.log(`   - Prenotazioni in scadenza: ${prenotazioniInScadenza.length}`);
      
      return {
        prenotazioniScadute,
        pagamentiScaduti,
        prenotazioniInScadenza: prenotazioniInScadenza.length
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
