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
        `SELECT pg.* FROM Pagamento pg
         JOIN Prenotazione p ON pg.id_prenotazione = p.id_prenotazione
         WHERE p.id_utente = $1
         ORDER BY pg.data_pagamento DESC`,
        [utente]
      );
    } else {
      return res.status(400).json({ error: 'Fornire prenotazione o utente' });
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
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
  const { id_prenotazione } = req.body;
  if (!id_prenotazione) return res.status(400).json({ error: 'id_prenotazione obbligatorio' });
  try {
    const pre = await pool.query(
      `SELECT data_inizio, data_fine FROM Prenotazione WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );
    if (pre.rowCount === 0) return res.status(404).json({ error: 'Prenotazione non trovata' });
    const { data_inizio, data_fine } = pre.rows[0];
    const ore = hoursBetween(data_inizio, data_fine);
    const importo = Math.max(1, Math.round(ore * BASE_RATE_EUR_PER_HOUR));
    const amountCents = importo * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true }
    });

    // salva record pagamento
    await pool.query(
      `INSERT INTO Pagamento (id_prenotazione, importo, data_pagamento, stato, metodo, provider, provider_payment_id, currency)
       VALUES ($1, $2, NOW(), 'in attesa', 'card', 'stripe', $3, 'EUR')`,
      [id_prenotazione, importo, paymentIntent.id]
    );

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, amount: importo });
  } catch (err) {
    res.status(500).json({ error: 'Errore Stripe' });
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