const pool = require('../db');
const Stripe = require('stripe');

// Calcolo importo mock: tariffa oraria base
const BASE_RATE_EUR_PER_HOUR = 10;

function hoursBetween(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const ms = end.getTime() - start.getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

// --- Stripe helpers ---
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

// DEPRECATED: usa getStripePublicConfig
exports.getStripeConfig = (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' });
};

// Registra un pagamento per una prenotazione (API legacy)
exports.creaPagamento = async (req, res) => {
  const { id_prenotazione, importo, data_pagamento, stato } = req.body;
  if (!id_prenotazione || !importo || !data_pagamento || !stato) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO Pagamento (id_prenotazione, importo, data_pagamento, stato)
       VALUES ($1, $2, $3, $4) RETURNING id_pagamento`,
      [id_prenotazione, importo, data_pagamento, stato]
    );
    res.status(201).json({ message: 'Pagamento registrato', id_pagamento: result.rows[0].id_pagamento });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Visualizza pagamenti per prenotazione o utente
exports.getPagamenti = async (req, res) => {
  const { prenotazione, utente } = req.query;
  try {
    let result;
    if (prenotazione) {
      result = await pool.query(
        `SELECT * FROM Pagamento WHERE id_prenotazione = $1 ORDER BY data_pagamento DESC`,
        [prenotazione]
      );
    } else if (utente) {
      result = await pool.query(
        `SELECT pg.*, sp.nome AS nome_spazio, s.nome AS nome_sede, s.citta AS citta_sede 
         FROM Pagamento pg
         JOIN Prenotazione p ON pg.id_prenotazione = p.id_prenotazione
         JOIN Spazio sp ON p.id_spazio = sp.id_spazio
         JOIN Sede s ON sp.id_sede = s.id_sede
         WHERE p.id_utente = $1
         ORDER BY pg.data_pagamento DESC`,
        [utente]
      );
    } else {
      return res.status(400).json({ error: 'Fornire prenotazione o utente' });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Errore getPagamenti:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// MOCK: Crea un intent di pagamento per una prenotazione
exports.createIntent = async (req, res) => {
  const { id_prenotazione } = req.body;
  if (!id_prenotazione) {
    return res.status(400).json({ error: 'id_prenotazione obbligatorio' });
  }
  try {
    // Recupera la prenotazione per determinarne la durata
    const pre = await pool.query(
      `SELECT data_inizio, data_fine FROM Prenotazione WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );
    if (pre.rowCount === 0) return res.status(404).json({ error: 'Prenotazione non trovata' });

    const { data_inizio, data_fine } = pre.rows[0];
    const ore = hoursBetween(data_inizio, data_fine);
    const importo = Math.max(1, Math.round(ore * BASE_RATE_EUR_PER_HOUR));

    const result = await pool.query(
      `INSERT INTO Pagamento (id_prenotazione, importo, data_pagamento, stato)
       VALUES ($1, $2, NOW(), 'in attesa') RETURNING id_pagamento, importo, stato`,
      [id_prenotazione, importo]
    );

    res.status(201).json({
      message: 'Intent creato',
      id_pagamento: result.rows[0].id_pagamento,
      importo: result.rows[0].importo,
      stato: result.rows[0].stato
    });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// MOCK: Conferma pagamento (simula esito positivo)
exports.confirmPayment = async (req, res) => {
  const { id } = req.params;
  try {
    const upd = await pool.query(
      `UPDATE Pagamento SET stato = 'pagato', data_pagamento = NOW() WHERE id_pagamento = $1 RETURNING *`,
      [id]
    );
    if (upd.rowCount === 0) return res.status(404).json({ error: 'Pagamento non trovato' });
    res.json({ message: 'Pagamento confermato', pagamento: upd.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// MOCK: Rimborso pagamento
exports.refundPayment = async (req, res) => {
  const { id } = req.params;
  try {
    const upd = await pool.query(
      `UPDATE Pagamento SET stato = 'rimborsato', data_pagamento = NOW() WHERE id_pagamento = $1 RETURNING *`,
      [id]
    );
    if (upd.rowCount === 0) return res.status(404).json({ error: 'Pagamento non trovato' });
    res.json({ message: 'Pagamento rimborsato', pagamento: upd.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// STRIPE: crea PaymentIntent e record Pagamento associato
exports.createCardIntent = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(400).json({ error: 'Stripe non configurato' });

  const { id_prenotazione, metadata } = req.body;
  // Prende l'ID utente dal middleware di autenticazione aggiornato
  const id_utente = req.user.id_utente;

  if (!id_prenotazione) return res.status(400).json({ error: 'id_prenotazione obbligatorio' });
  if (!id_utente) return res.status(400).json({ error: 'utente non autenticato' });

  try {
    // Recupera la prenotazione e i dettagli utente
    const pre = await pool.query(
      `SELECT p.data_inizio, p.data_fine, p.stato, u.email, u.nome, u.cognome 
       FROM Prenotazione p 
       JOIN Utente u ON p.id_utente = u.id_utente 
       WHERE p.id_prenotazione = $1`,
      [id_prenotazione]
    );

    if (pre.rowCount === 0) return res.status(404).json({ error: 'Prenotazione non trovata' });

    const { data_inizio, data_fine, stato, email, nome, cognome } = pre.rows[0];

    // Verifica che la prenotazione non sia già pagata
    if (stato === 'confermata') {
      return res.status(400).json({ error: 'Prenotazione già confermata' });
    }

    const ore = hoursBetween(data_inizio, data_fine);
    const importo = Math.max(1, Math.round(ore * BASE_RATE_EUR_PER_HOUR));
    const amountCents = importo * 100;

    // Crea o recupera il cliente Stripe
    let customer;
    const existingCustomer = await pool.query(
      'SELECT stripe_customer_id FROM Utente WHERE id_utente = $1',
      [id_utente]
    );

    if (existingCustomer.rows.length > 0 && existingCustomer.rows[0].stripe_customer_id) {
      customer = await stripe.customers.retrieve(existingCustomer.rows[0].stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email: email,
        name: `${nome} ${cognome}`,
        metadata: {
          utente_id: id_utente
        }
      });

      // Salva l'ID del cliente Stripe
      await pool.query(
        'UPDATE Utente SET stripe_customer_id = $1 WHERE id_utente = $2',
        [customer.id, id_utente]
      );
    }

    // Prepara i metadati per Stripe con informazioni complete
    const stripeMetadata = {
      prenotazione_id: id_prenotazione,
      utente_id: id_utente,
      ore: ore.toString(),
      data_inizio: data_inizio,
      data_fine: data_fine,
      importo: importo.toString(),
      ...metadata // Include i metadati aggiuntivi dal frontend
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      metadata: stripeMetadata,
      description: `Prenotazione coworking - ${ore}h - ${data_inizio} - ${metadata?.sede || 'Sede'} - ${metadata?.spazio || 'Spazio'}`
    });

    // Salva record pagamento
    await pool.query(
      `INSERT INTO Pagamento (id_prenotazione, importo, data_pagamento, stato, metodo, provider, provider_payment_id, currency, stripe_payment_intent_id)
       VALUES ($1, $2, NOW(), 'in attesa', 'card', 'stripe', $3, 'EUR', $3)
       ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET 
       importo = $2, data_pagamento = NOW(), stato = 'in attesa'`,
      [id_prenotazione, importo, paymentIntent.id]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: importo,
      customerId: customer.id
    });
  } catch (err) {
    console.error('Errore creazione PaymentIntent:', err);
    res.status(500).json({ error: 'Errore Stripe: ' + err.message });
  }
};

// STRIPE: completa pagamento aggiornando DB (post conferma client)
exports.completeCardPayment = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(400).json({ error: 'Stripe non configurato' });
  const { payment_intent_id } = req.body;
  if (!payment_intent_id) return res.status(400).json({ error: 'payment_intent_id obbligatorio' });
  try {
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (pi.status !== 'succeeded') {
      return res.status(400).json({ error: 'Pagamento non riuscito' });
    }
    const receiptUrl = pi.charges?.data?.[0]?.receipt_url || null;
    const upd = await pool.query(
      `UPDATE Pagamento SET stato = 'pagato', data_pagamento = NOW(), receipt_url = $2, updated_at = NOW()
       WHERE provider = 'stripe' AND provider_payment_id = $1 RETURNING *`,
      [payment_intent_id, receiptUrl]
    );
    if (upd.rowCount === 0) return res.status(404).json({ error: 'Pagamento non trovato' });
    res.json({ message: 'Pagamento registrato', pagamento: upd.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// STRIPE: verifica stato pagamento
exports.getPaymentStatus = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(400).json({ error: 'Stripe non configurato' });

  const { payment_intent_id } = req.params;
  if (!payment_intent_id) return res.status(400).json({ error: 'payment_intent_id obbligatorio' });

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
      metadata: paymentIntent.metadata
    });
  } catch (err) {
    console.error('Errore verifica stato pagamento:', err);
    res.status(500).json({ error: 'Errore verifica pagamento: ' + err.message });
  }
};

// STRIPE: recupera configurazione pubblica
exports.getStripePublicConfig = async (req, res) => {
  try {
    res.json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      currency: 'eur',
      supportedPaymentMethods: ['card']
    });
  } catch (err) {
    res.status(500).json({ error: 'Errore configurazione' });
  }
};

// Generico: conferma pagamento per metodi non-Stripe (PayPal, bonifico, crypto)
exports.confirmGenericPayment = async (req, res) => {
  const { payment_intent_id, method, id_prenotazione } = req.body;
  const id_utente = req.user.id_utente; // Assumed from authenticateToken middleware

  if (!payment_intent_id || !method || !id_prenotazione) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }

  try {
    // Recupera la prenotazione per calcolare l'importo
    const pre = await pool.query(
      `SELECT data_inizio, data_fine FROM Prenotazione WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const { data_inizio, data_fine } = pre.rows[0];
    const ore = hoursBetween(data_inizio, data_fine);
    const importo = Math.max(1, Math.round(ore * BASE_RATE_EUR_PER_HOUR));

    // Salva il pagamento generico
    const result = await pool.query(
      `INSERT INTO Pagamento (id_prenotazione, importo, data_pagamento, stato, metodo, provider, provider_payment_id, currency)
       VALUES ($1, $2, NOW(), 'pagato', $3, $3, $4, 'EUR')
       ON CONFLICT (provider_payment_id) DO UPDATE SET
       stato = 'pagato', data_pagamento = NOW()`,
      [id_prenotazione, importo, method, payment_intent_id]
    );

    // Aggiorna lo stato della prenotazione
    await pool.query(
      `UPDATE Prenotazione SET stato = 'confermata', data_pagamento = NOW() WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    res.json({
      message: 'Pagamento confermato',
      pagamento: {
        id_pagamento: result.rows[0]?.id_pagamento,
        metodo: method,
        importo: importo,
        stato: 'pagato'
      }
    });

  } catch (err) {
    console.error('Errore conferma pagamento generico:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Gestisce le prenotazioni in sospeso (quando l'utente interrompe il pagamento)
exports.suspendPrenotazione = async (req, res) => {
  const { id_prenotazione } = req.params;
  const id_utente = req.user.id_utente;

  if (!id_prenotazione) {
    return res.status(400).json({ error: 'ID prenotazione obbligatorio' });
  }

  try {
    // Verifica che la prenotazione appartenga all'utente
    const pre = await pool.query(
      `SELECT stato FROM Prenotazione WHERE id_prenotazione = $1 AND id_utente = $2`,
      [id_prenotazione, id_utente]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Aggiorna lo stato della prenotazione a "in sospeso"
    await pool.query(
      `UPDATE Prenotazione SET stato = 'in sospeso' WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    // Aggiorna anche il pagamento se esiste
    await pool.query(
      `UPDATE Pagamento SET stato = 'in sospeso' WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    res.json({
      message: 'Prenotazione messa in sospeso',
      stato: 'in sospeso'
    });

  } catch (err) {
    console.error('Errore sospensione prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
}; 