const pool = require('./src/db');
const fs = require('fs');
const path = require('path');

async function runStripeMigration() {
  try {
    console.log('🚀 Avvio migrazione Stripe...');
    
    // Leggi il file di migrazione
    const migrationPath = path.join(__dirname, '../database/migration-stripe.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 File di migrazione letto');
    
    // Esegui la migrazione
    await pool.query(migrationSQL);
    
    console.log('✅ Migrazione Stripe completata con successo!');
    console.log('📋 Colonne aggiunte:');
    console.log('   - Utente.stripe_customer_id');
    console.log('   - Pagamento.stripe_payment_intent_id');
    console.log('   - Prenotazione.data_pagamento');
    console.log('   - Vincoli CHECK aggiornati');
    console.log('   - Indici creati');
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Connessione database chiusa');
  }
}

// Esegui la migrazione
runStripeMigration();
