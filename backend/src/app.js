const express = require('express');
const cors = require('cors');
const config = require('../config/config');
const app = express();
const PORT = config.server.port;

// Middleware CORS per permettere richieste dal frontend
app.use(cors({
  origin: function (origin, callback) {
    // Lista degli origin permessi
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8000',
      'http://127.0.0.1:5500',
      'https://coworking-mio-1.onrender.com',
      'https://coworking-mio-1-backend.onrender.com'
    ];

    // Permetti richieste senza origin (es. Postman, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight per 24 ore
}));

// Gestisci le richieste OPTIONS (preflight) esplicitamente
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Middleware per loggare le richieste CORS
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  console.log(`CORS Headers - Origin: ${req.headers.origin}, Referer: ${req.headers.referer}`);
  console.log(`CORS Allowed Origins: ${JSON.stringify([
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:5500',
    'https://coworking-mio-1.onrender.com',
    'https://coworking-mio-1-backend.onrender.com'
  ])}`);
  next();
});

// Middleware per assicurarsi che gli header CORS siano sempre impostati
app.use((req, res, next) => {
  // Imposta sempre gli header CORS di base
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Se è una richiesta preflight, aggiungi header aggiuntivi
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Max-Age', '86400');
  }
  
  next();
});

app.use(express.json());

// Connessione DB
require('./db');

// Rotte di autenticazione
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// Rotte di catalogo
const catalogoRoutes = require('./routes/catalogo');
app.use('/api', catalogoRoutes);

// Rotte di prenotazioni
const prenotazioniRoutes = require('./routes/prenotazioni');
app.use('/api', prenotazioniRoutes);

// Rotte di pagamenti
const pagamentiRoutes = require('./routes/pagamenti');
app.use('/api', pagamentiRoutes);

// Rotte dashboard gestore
const gestoreRoutes = require('./routes/gestore');
app.use('/api', gestoreRoutes);

// Rotte webhook Stripe
const webhookRoutes = require('./routes/webhook');
app.use('/webhook', webhookRoutes);

// Rotte per gestione scadenze
const scadenzeRoutes = require('./routes/scadenze');
app.use('/api', scadenzeRoutes);

// Rotte per gestione concorrenza real-time
const concorrenzaRoutes = require('./routes/concorrenza');
app.use('/api/concorrenza', concorrenzaRoutes);

// Rotte per Server-Sent Events (SSE) - Sistema real-time
const sseRoutes = require('./routes/sse');
app.use('/api/sse', sseRoutes);

// Rotte per spazi (endpoint pubblici per disponibilità)
const spaziRoutes = require('./routes/spazi');
app.use('/api/spazi', spaziRoutes);

// Rotte dashboard responsabili
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// Log delle route caricate
console.log('🚀 Route spazi caricate:', spaziRoutes.stack?.map(r => r.route?.path).filter(Boolean));

// Endpoint di test per verificare se le route dashboard sono caricate
app.get('/api/test-dashboard', (req, res) => {
  res.json({
    message: 'Dashboard API attive',
    timestamp: new Date().toISOString(),
    routes: ['/dashboard/stats', '/dashboard/charts', '/dashboard/activity']
  });
});

// Endpoint di test per verificare la connessione al database
app.get('/api/test-db', async (req, res) => {
  try {
    const db = require('./db');
    const result = await db.query('SELECT NOW() as current_time, version() as db_version');
    res.json({
      message: 'Database connesso',
      timestamp: new Date().toISOString(),
      db_time: result.rows[0].current_time,
      db_version: result.rows[0].db_version
    });
  } catch (error) {
    console.error('❌ Errore test database:', error);
    res.status(500).json({ error: 'Errore connessione database', details: error.message });
  }
});

// Endpoint di test per verificare la struttura del database
app.get('/api/test-db-tables', async (req, res) => {
  try {
    const db = require('./db');

    // Prima verifica tutte le tabelle disponibili
    const allTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    const allTablesResult = await db.query(allTablesQuery);
    const allTables = allTablesResult.rows.map(row => row.table_name);

    // Poi verifica le colonne delle tabelle che ci interessano
    const tablesQuery = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('prenotazione', 'spazio', 'sede', 'utente', 'pagamento')
      ORDER BY table_name, ordinal_position
    `;

    const result = await db.query(tablesQuery);

    // Raggruppa per tabella
    const tables = {};
    result.rows.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push({
        column: row.column_name,
        type: row.data_type
      });
    });

    res.json({
      message: 'Struttura database verificata',
      timestamp: new Date().toISOString(),
      all_tables_available: allTables,
      tables_with_columns: tables,
      total_tables_found: Object.keys(tables).length
    });
  } catch (error) {
    console.error('❌ Errore verifica tabelle database:', error);
    res.status(500).json({ error: 'Errore verifica tabelle', details: error.message });
  }
});

// Endpoint di debug per testare le query SQL dashboard
app.get('/api/debug-dashboard-query', async (req, res) => {
  try {
    const db = require('./db');
    const { query_type, sede } = req.query;

    console.log('🔍 Debug Dashboard Query - Tipo:', query_type, 'Sede:', sede);

    let query, params;

    switch (query_type) {
      case 'prenotazioni':
        query = `
          SELECT 
            COUNT(*) as prenotazioni_oggi,
            COUNT(DISTINCT p.id_utente) as utenti_attivi
          FROM prenotazione p
          JOIN spazio s ON p.id_spazio = s.id_spazio
          WHERE DATE(p.data_inizio) = CURRENT_DATE
          ${sede ? 'AND s.id_sede = $1' : ''}
        `;
        params = sede ? [sede] : [];
        break;

      case 'fatturato':
        query = `
          SELECT COALESCE(SUM(p.importo), 0) as fatturato_giorno
          FROM prenotazione p
          JOIN spazio s ON p.id_spazio = s.id_spazio
          WHERE DATE(p.data_inizio) = CURRENT_DATE
          AND p.stato = 'confermata'
          ${sede ? 'AND s.id_sede = $1' : ''}
        `;
        params = sede ? [sede] : [];
        break;

      case 'occupazione':
        query = `
          SELECT 
            ROUND(
              (COUNT(CASE WHEN p.id_prenotazione IS NOT NULL THEN 1 END) * 100.0 / COUNT(s.id_spazio)), 2
            ) as occupazione_media
          FROM spazio s
          LEFT JOIN prenotazione p ON s.id_spazio = p.id_spazio 
            AND CURRENT_DATE BETWEEN DATE(p.data_inizio) AND DATE(p.data_fine)
            AND p.stato = 'confermata'
          WHERE s.stato = 'attivo'
          ${sede ? 'AND s.id_sede = $1' : ''}
        `;
        params = sede ? [sede] : [];
        break;

      default:
        return res.status(400).json({ error: 'Tipo query non valido' });
    }

    console.log('🔍 Debug Dashboard Query - Query:', query);
    console.log('🔍 Debug Dashboard Query - Parametri:', params);

    const result = await db.query(query, params);

    console.log('✅ Debug Dashboard Query - Risultato:', result.rows);

    res.json({
      success: true,
      query_type,
      sede,
      query,
      params,
      result: result.rows,
      row_count: result.rowCount
    });

  } catch (error) {
    console.error('❌ Debug Dashboard Query - Errore:', error);
    res.status(500).json({
      error: 'Errore query debug',
      details: error.message,
      stack: error.stack
    });
  }
});

// Endpoint di test temporaneo per verificare se le route scadenze sono caricate
app.get('/api/test-scadenze', (req, res) => {
  res.json({
    message: 'Route scadenze caricate correttamente',
    timestamp: new Date().toISOString(),
    routes: ['/api/scadenze/check', '/api/scadenze/status', '/api/scadenze/prenotazioni-scadute', '/api/scadenze/prenotazioni-in-scadenza']
  });
});

// Endpoint di test per la concorrenza
app.get('/api/test-concorrenza', (req, res) => {
  res.json({
    message: 'Route concorrenza caricate correttamente',
    timestamp: new Date().toISOString(),
    routes: ['/api/concorrenza/spazi/:id/stato-concorrenza'],
    test: 'Testa con: GET /api/concorrenza/spazi/1/stato-concorrenza'
  });
});


// Rotte analytics
const analyticsRoutes = require('./routes/analytics');
app.use('/api', analyticsRoutes);

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Endpoint di test CORS
app.get('/api/test-cors', (req, res) => {
  console.log('Test CORS chiamato con origin:', req.headers.origin);
  
  // Imposta esplicitamente gli header CORS per questo endpoint
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString(),
    cors_headers: {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
});

// Endpoint di test CORS specifico per sedi
app.get('/api/test-sedi-cors', (req, res) => {
  console.log('Test sedi CORS chiamato con origin:', req.headers.origin);
  
  // Imposta esplicitamente gli header CORS per questo endpoint
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    message: 'CORS sedi test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString(),
    test: 'Questo endpoint dovrebbe funzionare come /api/sedi',
    cors_headers: {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
});

// Endpoint di debug CORS completo
app.get('/api/debug-cors', (req, res) => {
  console.log('🔍 Debug CORS - Richiesta ricevuta');
  console.log('Headers completi:', req.headers);
  console.log('Origin:', req.headers.origin);
  console.log('Referer:', req.headers.referer);
  console.log('User-Agent:', req.headers['user-agent']);
  
  // Imposta esplicitamente gli header CORS
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID, X-Requested-With, Accept, Origin');
  
  res.json({
    message: 'Debug CORS completo',
    timestamp: new Date().toISOString(),
    request: {
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      referer: req.headers.referer,
      user_agent: req.headers['user-agent'],
      all_headers: req.headers
    },
    cors_config: {
      allowed_origins: [
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:5500',
        'https://coworking-mio-1.onrender.com',
        'https://coworking-mio-1-backend.onrender.com'
      ],
      response_headers: {
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Requested-With, Accept, Origin'
      }
    }
  });
});

// Endpoint di test disponibilità senza autenticazione (per debug)
app.get('/api/test-disponibilita', (req, res) => {
  const { data_inizio, data_fine } = req.query;
  res.json({
    message: 'Test disponibilità senza auth',
    data_inizio,
    data_fine,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di debug per testare la connessione al database
app.get('/api/debug/db-test', async (req, res) => {
  try {
    const pool = require('./db');
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    res.json({
      message: 'Database connection successful',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      error: 'Database connection failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint di debug per testare le sedi
app.get('/api/debug/sedi-test', async (req, res) => {
  try {
    const pool = require('./db');
    const result = await pool.query('SELECT COUNT(*) as sede_count FROM Sede');
    res.json({
      message: 'Sedi query successful',
      sede_count: result.rows[0].sede_count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sedi test error:', error);
    res.status(500).json({
      error: 'Sedi query failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint di test per le route spazi
app.get('/api/test-spazi', (req, res) => {
  res.json({
    message: 'Route spazi test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString(),
    test: 'Questo endpoint dovrebbe funzionare come /api/spazi'
  });
});

// Endpoint di test per disponibilità slot
app.get('/api/test-disponibilita-slot', (req, res) => {
  const { id_spazio, data } = req.query;
  res.json({
    message: 'Test disponibilità slot senza auth',
    id_spazio,
    data,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Avvia il cron job per le scadenze
const scadenzeCron = require('./cron/scadenzeCron');
scadenzeCron.start();

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('🚀 Cron job scadenze avviato automaticamente');
}); 