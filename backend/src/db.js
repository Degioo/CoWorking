const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'coworkspace',
  password: process.env.PGPASSWORD || 'password',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

pool.on('connect', () => {
  console.log('Connesso a PostgreSQL!');
});

module.exports = pool; 