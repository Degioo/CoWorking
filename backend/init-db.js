const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../database/coworkspace.sqlite');
const schemaPath = path.resolve(__dirname, '../database/schema.sql');
const seedPath = path.resolve(__dirname, '../database/seed.sql');

// Rimuovi database esistente se presente
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Database esistente rimosso');
}

const db = new sqlite3.Database(dbPath);

console.log('Creazione database SQLite...');

// Leggi e esegui schema
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema, (err) => {
  if (err) {
    console.error('Errore creazione schema:', err);
    return;
  }
  console.log('Schema creato con successo');
  
  // Leggi e esegui seed
  const seed = fs.readFileSync(seedPath, 'utf8');
  db.exec(seed, (err) => {
    if (err) {
      console.error('Errore inserimento dati:', err);
      return;
    }
    console.log('Dati di esempio inseriti con successo');
    console.log('Database inizializzato!');
    db.close();
  });
}); 