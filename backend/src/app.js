const express = require('express');
const cors = require('cors');
const config = require('../config/config');
<<<<<<< HEAD
=======
const { authenticateToken } = require('./middleware/auth');
>>>>>>> upstream/main
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Requested-With']
}));

// Gestisci le richieste OPTIONS (preflight)
app.options('*', cors());

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

<<<<<<< HEAD
// Log delle route caricate
console.log('🚀 Route spazi caricate:', spaziRoutes.stack?.map(r => r.route?.path).filter(Boolean));

// Endpoint di test temporaneo per verificare se le route scadenze sono caricate
=======
// Rotte dashboard responsabili
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// Rotte per sedi (endpoint pubblici per gestori)
const sediRoutes = require('./routes/sedi');
app.use('/api/sedi', sediRoutes);

// Rotte per A/B testing
const abTestingRoutes = require('./routes/ab-testing');
app.use('/api/ab-testing', abTestingRoutes);

// Rotte per utenti (endpoint per gestori)
const utentiRoutes = require('./routes/utenti');
app.use('/api/utenti', utentiRoutes);

// Log delle route caricate
console.log('🚀 Route spazi caricate:', spaziRoutes.stack?.map(r => r.route?.path).filter(Boolean));
console.log('🚀 Route sedi caricate:', sediRoutes.stack?.map(r => r.route?.path).filter(Boolean));
console.log('🚀 Route A/B testing caricate:', abTestingRoutes.stack?.map(r => r.route?.path).filter(Boolean));

// Endpoint di test per verificare se le route scadenze sono caricate
>>>>>>> upstream/main
app.get('/api/test-scadenze', (req, res) => {
  res.json({
    message: 'Route scadenze caricate correttamente',
    timestamp: new Date().toISOString(),
    routes: ['/api/scadenze/check', '/api/scadenze/status', '/api/scadenze/prenotazioni-scadute', '/api/scadenze/prenotazioni-in-scadenza']
  });
});

<<<<<<< HEAD
=======
// Endpoint di test per verificare l'autenticazione
app.get('/api/test-auth', (req, res) => {
  res.json({
    message: 'Test autenticazione',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di test per verificare l'autenticazione con middleware
app.get('/api/test-auth-protected', authenticateToken, (req, res) => {
  res.json({
    message: 'Test autenticazione protetta',
    user: req.user,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

>>>>>>> upstream/main
// Endpoint di test per la concorrenza
app.get('/api/test-concorrenza', (req, res) => {
  res.json({
    message: 'Route concorrenza caricate correttamente',
    timestamp: new Date().toISOString(),
    routes: ['/api/concorrenza/spazi/:id/stato-concorrenza'],
    test: 'Testa con: GET /api/concorrenza/spazi/1/stato-concorrenza'
  });
});

<<<<<<< HEAD

=======
>>>>>>> upstream/main
// Rotte analytics
const analyticsRoutes = require('./routes/analytics');
app.use('/api', analyticsRoutes);

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Endpoint di test CORS
app.get('/api/test-cors', (req, res) => {
  console.log('Test CORS chiamato con origin:', req.headers.origin);
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di test CORS specifico per sedi
app.get('/api/test-sedi-cors', (req, res) => {
  console.log('Test sedi CORS chiamato con origin:', req.headers.origin);
  res.json({
    message: 'CORS sedi test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString(),
    test: 'Questo endpoint dovrebbe funzionare come /api/sedi'
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

<<<<<<< HEAD
=======
// Endpoint di test per verificare il token JWT inviato
app.get('/api/test-token', (req, res) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 Test Token - Auth Header:', authHeader);

  if (!authHeader) {
    return res.status(401).json({
      error: 'Nessun header Authorization',
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Header Authorization deve iniziare con "Bearer "',
      authHeader,
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.substring(7);
  console.log('🔐 Test Token - Token estratto:', token ? token.substring(0, 20) + '...' : 'null');

  res.json({
    message: 'Token ricevuto correttamente',
    tokenLength: token ? token.length : 0,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

>>>>>>> upstream/main
// Avvia il cron job per le scadenze
const scadenzeCron = require('./cron/scadenzeCron');
scadenzeCron.start();

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('🚀 Cron job scadenze avviato automaticamente');
<<<<<<< HEAD
}); 
=======
});
>>>>>>> upstream/main
