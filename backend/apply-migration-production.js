const { Client } = require('pg');

// Configurazione per il database di produzione (Render)
const config = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/coworkspace',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function applyMigration() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✅ Connesso al database di produzione');
    
    // Leggi e esegui la migrazione
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.resolve(__dirname, '../database/add-spazio-prenotazione-fields.sql');
    
    const migration = fs.readFileSync(migrationPath, 'utf8');
    console.log('📋 Applicazione migrazione...');
    
    // Esegui la migrazione
    await client.query(migration);
    console.log('✅ Migrazione applicata con successo!');
    
    // Verifica che i campi siano stati aggiunti
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'spazio' 
      AND column_name IN ('stato', 'ultima_prenotazione', 'utente_prenotazione')
      ORDER BY column_name;
    `);
    
    console.log('🔍 Verifica campi aggiunti:');
    console.table(result.rows);
    
    await client.end();
    console.log('🎉 Migrazione completata!');
    
  } catch (err) {
    console.error('❌ Errore durante la migrazione:', err.message);
    console.error('Stack:', err.stack);
    
    if (err.code === '42P07') {
      console.log('ℹ️ Campo già esistente, continuando...');
    } else if (err.code === '42710') {
      console.log('ℹ️ Constraint già esistente, continuando...');
    } else if (err.code === '42P06') {
      console.log('ℹ️ Indice già esistente, continuando...');
    }
    
    try {
      await client.end();
    } catch (closeErr) {
      console.error('Errore chiusura connessione:', closeErr.message);
    }
  }
}

// Esegui la migrazione
applyMigration();
