# Configurazione Render per Supabase

## Variabili d'Ambiente da Configurare su Render

### 1. Vai su Render Dashboard
- Accedi a [render.com](https://render.com)
- Seleziona il tuo servizio backend

### 2. Configura le Variabili d'Ambiente

#### **Database (Supabase)**
```
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres
```
- Sostituisci `[YOUR_PASSWORD]` con la password del database Supabase
- Sostituisci `[YOUR_HOST]` con l'host del database Supabase

#### **Server**
```
PORT=3002
NODE_ENV=production
```

#### **CORS**
```
CORS_ORIGIN=https://coworking-mio-1.onrender.com,https://coworking-mio-1-backend.onrender.com
```

#### **JWT**
```
JWT_SECRET=your_very_secure_jwt_secret_here
JWT_EXPIRES_IN=24h
```

#### **Stripe (opzionale)**
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Come Trovare la DATABASE_URL su Supabase

1. Vai su [supabase.com](https://supabase.com)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **Database**
4. Copia la **Connection string** dalla sezione **Connection pooling**
5. Sostituisci `[YOUR-PASSWORD]` con la password del database

### 4. Riavvia il Servizio

Dopo aver configurato le variabili d'ambiente:
1. Vai su **Manual Deploy**
2. Clicca **Deploy latest commit**

### 5. Test della Configurazione

Una volta configurato, testa questi endpoint:

- **Test Database**: `https://your-backend.onrender.com/api/debug/db-test`
- **Test Sedi**: `https://your-backend.onrender.com/api/debug/sedi-test`
- **Test CORS**: `https://your-backend.onrender.com/api/test-cors`

### 6. Risoluzione Problemi

Se le sedi non si caricano:
1. Verifica che `DATABASE_URL` sia corretta
2. Controlla i log su Render
3. Testa gli endpoint di debug
4. Verifica che le tabelle esistano nel database Supabase

### 7. Struttura Database Richiesta

Assicurati che nel database Supabase esistano queste tabelle:
- `Sede` (id_sede, nome, citta, indirizzo, descrizione)
- `Spazio` (id_spazio, id_sede, nome, tipologia)
- `Utente` (id_utente, nome, cognome, email, password_hash, ruolo)
- `Prenotazione` (id_prenotazione, id_utente, id_spazio, data_inizio, data_fine, stato)
