const express = require('express');
const cors = require('cors');
const config = require('../config/config');
const app = express();
const PORT = config.server.port;

// Middleware CORS per permettere richieste dal frontend
app.use(cors(config.cors));

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

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}); 