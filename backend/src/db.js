const { Pool } = require('pg');

// Usa DATABASE_URL se disponibile, altrimenti fallback alle variabili singole
const pool = new Pool(
  process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  } : {
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'coworkspace',
    password: process.env.PGPASSWORD || 'password',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  }
);

pool.on('connect', () => {
  console.log('Connesso a PostgreSQL!');
});

module.exports = pool; 