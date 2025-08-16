# 🚀 Configurazione Completa Sistema Coworking Mio

## 📋 Panoramica del Sistema

Il sistema è composto da:
- **Frontend**: Sito web su Render (`coworking-mio-1.onrender.com`)
- **Backend**: API su Render (`coworking-mio-1-backend.onrender.com`)
- **Database**: PostgreSQL su Supabase

## 🔧 Configurazione Backend su Render

### 1. Variabili d'Ambiente Necessarie

Vai su [render.com](https://render.com) → Seleziona il tuo servizio backend → **Environment**:

#### **Database (Supabase) - OBBLIGATORIO**
```
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres
```

#### **Server - OBBLIGATORIO**
```
PORT=3002
NODE_ENV=production
```

#### **JWT - OBBLIGATORIO**
```
JWT_SECRET=your_very_secure_jwt_secret_here
JWT_EXPIRES_IN=24h
```

#### **CORS - OBBLIGATORIO**
```
CORS_ORIGIN=https://coworking-mio-1.onrender.com,https://coworking-mio-1-backend.onrender.com
```

#### **Stripe (opzionale)**
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Come Trovare DATABASE_URL su Supabase

1. Vai su [supabase.com](https://supabase.com)
2. Seleziona il tuo progetto
3. **Settings** → **Database**
4. Copia la **Connection string** dalla sezione **Connection pooling**
5. Sostituisci `[YOUR-PASSWORD]` con la password del database

### 3. Riavvia il Servizio

1. **Manual Deploy** → **Deploy latest commit**

## 🌐 Configurazione Frontend

### 1. URL Backend Corretto

Il frontend è già configurato per usare automaticamente:
- **Produzione**: `https://coworking-mio-1-backend.onrender.com/api`
- **Sviluppo locale**: `http://localhost:3002/api`

### 2. Test della Connessione

Apri la console del browser su qualsiasi pagina e dovresti vedere:
```
🔄 Test connessione backend...
Test connessione backend a: https://coworking-mio-1-backend.onrender.com/api
✅ Backend connesso: {message: "pong"}
```

## 🧪 Test del Sistema

### 1. Test Backend
- **Ping**: `https://coworking-mio-1-backend.onrender.com/api/ping`
- **Database**: `https://coworking-mio-1-backend.onrender.com/api/debug/db-test`
- **Sedi**: `https://coworking-mio-1-backend.onrender.com/api/debug/sedi-test`

### 2. Test Frontend
- **Homepage**: `https://coworking-mio-1.onrender.com`
- **Prenotazione**: `https://coworking-mio-1.onrender.com/prenota.html`
- **Dashboard**: `https://coworking-mio-1.onrender.com/dashboard.html`

## 🚨 Risoluzione Problemi

### Problema: Sedi non si caricano
**Sintomi**: Pagina bianca, errore nella console, "Loading..." infinito

**Cause possibili**:
1. **Backend non configurato**: Mancano le variabili d'ambiente su Render
2. **Database non raggiungibile**: `DATABASE_URL` errata
3. **CORS bloccato**: Frontend e backend su domini diversi

**Soluzioni**:
1. Verifica variabili d'ambiente su Render
2. Controlla log del backend su Render
3. Testa endpoint di debug
4. Verifica che le tabelle esistano su Supabase

### Problema: Tasto precedente non funziona
**Sintomi**: Errore "nextStep is not defined" nella console

**Soluzione**: ✅ **RISOLTO** - Funzioni implementate correttamente

### Problema: Dashboard gestori accessibile senza login
**Sintomi**: Accesso diretto senza autenticazione

**Soluzione**: ✅ **GIÀ PROTETTA** - Usa `authenticateToken` middleware

## 📊 Struttura Database Richiesta

Assicurati che su Supabase esistano queste tabelle:

```sql
-- Tabella Sedi
CREATE TABLE Sede (
    id_sede SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    citta VARCHAR(100) NOT NULL,
    indirizzo TEXT NOT NULL,
    descrizione TEXT
);

-- Tabella Spazi
CREATE TABLE Spazio (
    id_spazio SERIAL PRIMARY KEY,
    id_sede INTEGER REFERENCES Sede(id_sede),
    nome VARCHAR(100) NOT NULL,
    tipologia VARCHAR(50) NOT NULL
);

-- Tabella Utenti
CREATE TABLE Utente (
    id_utente SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ruolo VARCHAR(20) DEFAULT 'utente'
);

-- Tabella Prenotazioni
CREATE TABLE Prenotazione (
    id_prenotazione SERIAL PRIMARY KEY,
    id_utente INTEGER REFERENCES Utente(id_utente),
    id_spazio INTEGER REFERENCES Spazio(id_spazio),
    data_inizio TIMESTAMP NOT NULL,
    data_fine TIMESTAMP NOT NULL,
    stato VARCHAR(20) DEFAULT 'pendente'
);
```

## 🔍 Debug e Logging

### Console Browser
Apri la console su qualsiasi pagina per vedere:
- Configurazione caricata
- Test connessione backend
- Errori API
- Stato autenticazione

### Log Render
Su Render → Backend → **Logs** per vedere:
- Errori database
- Richieste API
- Problemi CORS

## 📞 Supporto

Se hai problemi:
1. Controlla la console del browser
2. Verifica i log su Render
3. Testa gli endpoint di debug
4. Verifica la configurazione delle variabili d'ambiente

## 🎯 Checklist Configurazione

- [ ] Variabili d'ambiente configurate su Render
- [ ] `DATABASE_URL` corretta per Supabase
- [ ] Backend riavviato su Render
- [ ] Frontend testato su produzione
- [ ] Console browser senza errori
- [ ] Endpoint di debug funzionanti
- [ ] Sedi si caricano correttamente
- [ ] Navigazione prenotazione funziona
- [ ] Dashboard gestori protetta

