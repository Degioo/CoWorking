const ScadenzeController = require('../controllers/scadenzeController');

class ScadenzeService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // 5 minuti
  }
  
  // Avvia il servizio automatico
  start() {
    if (this.isRunning) {
      console.log('⚠️ Servizio scadenze già in esecuzione');
      return;
    }
    
    console.log('🚀 Avvio servizio automatico scadenze...');
    this.isRunning = true;
    
    // Esegui il primo controllo immediatamente
    this.eseguiControllo();
    
    // Poi esegui controlli ogni 5 minuti
    this.intervalId = setInterval(() => {
      this.eseguiControllo();
    }, this.checkInterval);
    
    console.log(`✅ Servizio scadenze avviato (controlli ogni ${this.checkInterval / 1000 / 60} minuti)`);
  }
  
  // Ferma il servizio automatico
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Servizio scadenze non in esecuzione');
      return;
    }
    
    console.log('🛑 Arresto servizio automatico scadenze...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('✅ Servizio scadenze arrestato');
  }
  
  // Esegue un controllo di scadenza
  async eseguiControllo() {
    try {
      console.log(`\n🕐 Controllo scadenze automatico - ${new Date().toLocaleString('it-IT')}`);
      
      const risultati = await ScadenzeController.eseguiControlliScadenza();
      
      // Log dei risultati
      if (risultati.prenotazioniScadute > 0 || risultati.pagamentiScaduti > 0) {
        console.log(`📊 Risultati controllo scadenze:`);
        console.log(`   - Prenotazioni scadute: ${risultati.prenotazioniScadute}`);
        console.log(`   - Pagamenti scaduti: ${risultati.pagamentiScaduti}`);
        console.log(`   - Prenotazioni in scadenza: ${risultati.prenotazioniInScadenza}`);
      } else {
        console.log('✅ Nessuna scadenza da gestire');
      }
      
    } catch (error) {
      console.error('❌ Errore durante controllo automatico scadenze:', error);
    }
  }
  
  // Esegue un controllo manuale
  async eseguiControlloManuale() {
    try {
      console.log('🔧 Controllo scadenze manuale richiesto...');
      const risultati = await ScadenzeController.eseguiControlliScadenza();
      return risultati;
    } catch (error) {
      console.error('❌ Errore durante controllo manuale scadenze:', error);
      throw error;
    }
  }
  
  // Ottiene lo stato del servizio
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      lastCheck: this.lastCheck,
      nextCheck: this.isRunning ? new Date(Date.now() + this.checkInterval) : null
    };
  }
  
  // Modifica l'intervallo di controllo
  setCheckInterval(minutes) {
    const newInterval = minutes * 60 * 1000;
    
    if (this.isRunning) {
      // Riavvia il servizio con il nuovo intervallo
      this.stop();
      this.checkInterval = newInterval;
      this.start();
    } else {
      this.checkInterval = newInterval;
    }
    
    console.log(`⚙️ Intervallo controllo scadenze impostato a ${minutes} minuti`);
  }
}

// Esporta un'istanza singleton
const scadenzeService = new ScadenzeService();

module.exports = scadenzeService;
