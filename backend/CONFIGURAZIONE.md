# Configurazione Sistema di Pagamento

## 1. Configurazione Database

### Aggiorna lo schema del database
Esegui lo script di migrazione per aggiungere i campi Stripe:
```sql
\i database/migration-stripe.sql
```

### Verifica che le tabelle abbiano i campi corretti:
- `Utente.stripe_customer_id` (TEXT UNIQUE)
- `Pagamento.stripe_payment_intent_id` (TEXT UNIQUE)
- `Prenotazione.data_pagamento` (TIMESTAMP)
- `Prenotazione.stato` deve includere: 'pendente', 'in attesa', 'confermata', 'annullata', 'completata', 'pagamento_fallito'

## 2. Configurazione Stripe

### Crea un file `.env` nella cartella `backend` con:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coworkspace
DB_USER=postgres
DB_PASSWORD=password

# Server
PORT=3002
NODE_ENV=development

# Stripe (sostituisci con le tue chiavi)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_WsLhQ9QXBBUdppq2marA47aOewWctgi9

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:5500
```

## 3. Configurazione Frontend

### Aggiorna `frontend/public/js/config.js` con i tuoi dati:
```javascript
const CONFIG = {
    // Sostituisci con il tuo URL Supabase
    SUPABASE_URL: 'https://your-project.supabase.co',
    
    // Sostituisci con la tua API Key pubblica di Supabase
    SUPABASE_ANON_KEY: 'your-supabase-anon-key-here',
    
    // Base URL per le API (se usi Supabase Edge Functions)
    API_BASE: 'https://your-project.supabase.co/functions/v1',
    
    // Fallback per sviluppo locale (commenta se usi solo Supabase)
    // API_BASE: 'http://localhost:3002/api'
};
```

## 4. Installazione Dipendenze

```bash
cd backend
npm install
```

## 5. Avvio Sistema

### Backend:
```bash
cd backend
npm start
# oppure
node src/app.js
```

### Frontend:
Apri `frontend/public/index.html` in un browser o usa un server locale.

## 6. Test Sistema

1. **Registrazione/Login**: Crea un account utente
2. **Prenotazione**: Crea una prenotazione per uno spazio
3. **Pagamento**: Clicca "Paga Ora" e completa il pagamento con Stripe
4. **Verifica**: Controlla che la prenotazione sia stata confermata

## 7. Troubleshooting

### Errore "Stripe non configurato":
- Verifica che le chiavi Stripe siano nel file `.env`
- Riavvia il server dopo aver modificato `.env`

### Errore "Token non valido":
- Verifica che l'utente sia loggato
- Controlla che il JWT_SECRET sia configurato

### Errore database:
- Esegui lo script di migrazione
- Verifica la connessione al database

## 8. Webhook Stripe

### Configura il webhook su Stripe Dashboard:
- URL: `https://your-domain.com/webhook`
- Eventi: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

### Test locale con Stripe CLI:
```bash
stripe listen --forward-to localhost:3002/webhook
```
