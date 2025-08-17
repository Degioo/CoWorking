const scadenzeService = require('./src/services/scadenzeService');

console.log('🚀 Avvio servizio scadenze automatiche...');

// Avvia il servizio
scadenzeService.start();

// Gestisci la chiusura graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Arresto servizio scadenze...');
  scadenzeService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arresto servizio scadenze...');
  scadenzeService.stop();
  process.exit(0);
});

console.log('✅ Servizio scadenze avviato. Premi Ctrl+C per fermarlo.');
console.log('📊 Controlli eseguiti ogni 5 minuti');
console.log('⏰ Prossimo controllo tra 5 minuti...');
