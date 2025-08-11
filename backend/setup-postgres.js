const { Client } = require('pg');

// Configurazione per PostgreSQL locale
const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // database di default
  password: 'password', // password dell'utente postgres
  port: 5432,
};

async function setupDatabase() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✅ Connesso a PostgreSQL');
    
    // Crea il database se non esiste
    try {
      await client.query('CREATE DATABASE coworkspace');
      console.log('✅ Database coworkspace creato');
    } catch (err) {
      if (err.code === '42P04') {
        console.log('ℹ️ Database coworkspace già esistente');
      } else {
        throw err;
      }
    }
    
    await client.end();
    
    // Ora connetti al database coworkspace e crea le tabelle
    const dbClient = new Client({
      ...config,
      database: 'coworkspace'
    });
    
    await dbClient.connect();
    console.log('✅ Connesso al database coworkspace');
    
    // Leggi e esegui schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.resolve(__dirname, '../database/schema.sql');
    const seedPath = path.resolve(__dirname, '../database/seed.sql');
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await dbClient.query(schema);
    console.log('✅ Schema creato/aggiornato');
    
    const seed = fs.readFileSync(seedPath, 'utf8');
    await dbClient.query(seed);
    console.log('✅ Dati di esempio inseriti/aggiornati');
    
    await dbClient.end();
    console.log('🎉 Setup completato con successo!');
    console.log('\n📋 Prossimi passi:');
    console.log('1. Avvia il server: npm start');
    console.log('2. Apri il frontend: frontend/public/index.html');
    
  } catch (err) {
    console.error('❌ Errore durante il setup:', err.message);
    console.log('\n🔧 Possibili soluzioni:');
    console.log('1. Verifica che PostgreSQL sia in esecuzione');
    console.log('2. Controlla che l\'utente postgres abbia password "password"');
    console.log('3. Verifica che la porta 5432 sia libera');
  }
}

setupDatabase(); 