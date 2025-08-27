# DOCUMENTAZIONE COMPLETA BACKEND E DATABASE - CoWorking

## Indice
1. [Panoramica Generale](#panoramica-generale)
2. [Struttura del Progetto](#struttura-del-progetto)
3. [File di Configurazione](#file-di-configurazione)
4. [File Principali del Backend](#file-principali-del-backend)
5. [Controller](#controller)
6. [Route](#route)
7. [Middleware](#middleware)
8. [Servizi](#servizi)
9. [Cron Jobs](#cron-jobs)
10. [Database](#database)
11. [Script di Setup](#script-di-setup)

---

## Panoramica Generale

Il progetto CoWorking è un sistema di gestione spazi di coworking che include:
- Autenticazione utenti con JWT
- Gestione prenotazioni spazi
- Sistema di pagamenti con Stripe
- Gestione scadenze automatiche
- Sistema real-time per concorrenza
- Dashboard per gestori e amministratori
- API RESTful complete

---

## Struttura del Progetto

```
backend/
├── config/           # Configurazioni
├── src/
│   ├── controllers/  # Logica di business
│   ├── routes/       # Definizione endpoint API
│   ├── middleware/   # Middleware personalizzati
│   ├── services/     # Servizi business
│   ├── cron/         # Job schedulati
│   └── config/       # Configurazioni JWT
├── database/         # Schema e migrazioni DB
└── scripts/          # Script di setup e utility
```

---

## File di Configurazione

### 1. `backend/package.json`
**Descrizione**: Configurazione del progetto Node.js con dipendenze e script.

**Script disponibili**:
- `start`: Avvia il server principale
- `start-scadenze`: Avvia il servizio gestione scadenze
- `install-deps`: Installa le dipendenze principali
- `setup-db`: Configura il database PostgreSQL
- `migrate-stripe`: Esegue migrazioni Stripe

**Dipendenze principali**:
- `express`: Framework web
- `pg`: Client PostgreSQL
- `bcryptjs`: Hashing password
- `jsonwebtoken`: Gestione JWT
- `stripe`: Integrazione pagamenti
- `cors`: Gestione CORS
- `dotenv`: Variabili d'ambiente

### 2. `backend/config/config.js`
**Descrizione**: Configurazione centralizzata dell'applicazione.

**Esporta**:
- `database`: Configurazione connessione DB
- `server`: Porta e ambiente
- `stripe`: Chiavi API Stripe
- `jwt`: Configurazione token
- `cors`: Origini permesse

**Funzionalità**:
- Gestione configurazione locale vs produzione
- Fallback per variabili d'ambiente
- Configurazione CORS dinamica

### 3. `backend/config/env.js`
**Descrizione**: Gestione variabili d'ambiente per Supabase/Render.

**Variabili gestite**:
- `DATABASE_URL`: Connessione database Supabase
- `PORT`: Porta server (default: 3002)
- `NODE_ENV`: Ambiente (development/production)
- `JWT_SECRET`: Chiave segreta JWT
- `STRIPE_*`: Chiavi API Stripe

### 4. `backend/config/stripe.js`
**Descrizione**: Configurazione e inizializzazione Stripe.

**Esporta**:
- `stripe`: Istanza Stripe configurata
- `config`: Configurazione Stripe

**Funzionalità**:
- Inizializzazione client Stripe
- Gestione chiavi segrete e pubbliche

### 5. `backend/src/config/jwt.js`
**Descrizione**: Gestione token JWT per autenticazione.

**Funzioni esportate**:
- `generateToken(payload)`: Genera token JWT
- `verifyToken(token)`: Verifica validità token

**Configurazioni**:
- Scadenza: 24 ore
- Issuer: coworking-mio
- Audience: coworking-mio-users

---

## File Principali del Backend

### 1. `backend/src/app.js`
**Descrizione**: File principale dell'applicazione Express.

**Funzionalità principali**:
- Configurazione middleware CORS
- Caricamento route API
- Gestione errori
- Endpoint di test e debug
- Avvio cron job scadenze

**Route caricate**:
- `/api/*`: Route principali (auth, catalogo, prenotazioni, etc.)
- `/webhook`: Webhook Stripe
- `/api/sse/*`: Server-Sent Events
- `/api/concorrenza/*`: Sistema concorrenza real-time

**Endpoint di test**:
- `/api/ping`: Test connessione
- `/api/test-cors`: Test configurazione CORS
- `/api/debug/db-test`: Test connessione database
- `/api/test-scadenze`: Test route scadenze

---

## Controller

### 1. `backend/src/controllers/authController.js`
**Descrizione**: Gestione autenticazione e registrazione utenti.

**Funzioni esportate**:
- `register(req, res)`: Registrazione nuovo utente
  - Valida campi obbligatori
  - Hash password con bcrypt
  - Crea utente nel database
  - Genera token JWT
  - Gestisce duplicati email

- `login(req, res)`: Autenticazione utente
  - Verifica credenziali
  - Confronta password hash
  - Genera token JWT
  - Log dettagliato per debug

### 2. `backend/src/controllers/catalogoController.js`
**Descrizione**: Gestione catalogo sedi, spazi e servizi.

**Funzioni esportate**:
- `getSedi(req, res)`: Recupera sedi (con filtro città opzionale)
- `getSpazi(req, res)`: Recupera spazi (con filtri sede e tipologia)
- `getServizi(req, res)`: Recupera tutti i servizi
- `getServiziSpazio(req, res)`: Recupera servizi di uno spazio specifico
- `testDatabaseConnection(req, res)`: Test performance e connessione DB

**Caratteristiche**:
- Logging dettagliato performance
- Filtri dinamici SQL
- Gestione errori robusta

### 3. `backend/src/controllers/prenotazioniController.js`
**Descrizione**: Gestione completa del sistema prenotazioni.

**Funzioni principali**:
- `checkDisponibilita(req, res)`: Verifica disponibilità spazio
  - Controlla sovrapposizioni prenotazioni
  - Gestisce stati diversi (confermata, in attesa)
  - Validazione date

- `creaPrenotazione(req, res)`: Crea nuova prenotazione
  - Validazione parametri
  - Controllo disponibilità
  - Creazione record prenotazione

**Caratteristiche**:
- Gestione stati prenotazione multipli
- Controlli sovrapposizione temporale
- Integrazione con sistema SSE per aggiornamenti real-time

### 4. `backend/src/controllers/pagamentiController.js`
**Descrizione**: Gestione pagamenti e integrazione Stripe.

**Funzionalità**:
- Creazione intent di pagamento
- Gestione webhook Stripe
- Rimborsi e gestione stati
- Storico transazioni

### 5. `backend/src/controllers/gestoreController.js`
**Descrizione**: Dashboard e funzionalità per gestori spazi.

**Funzionalità**:
- Gestione prenotazioni
- Statistiche utilizzo
- Gestione spazi e sedi

### 6. `backend/src/controllers/scadenzeController.js`
**Descrizione**: Gestione automatica scadenze prenotazioni.

**Funzionalità**:
- Controllo prenotazioni scadute
- Aggiornamento stati automatico
- Notifiche scadenze

### 7. `backend/src/controllers/concorrenzaController.js`
**Descrizione**: Sistema real-time per gestione concorrenza prenotazioni.

**Funzionalità**:
- Monitoraggio prenotazioni simultanee
- Notifiche real-time
- Gestione conflitti

### 8. `backend/src/controllers/sseController.js`
**Descrizione**: Server-Sent Events per aggiornamenti real-time.

**Funzionalità**:
- Connessioni SSE persistenti
- Broadcast aggiornamenti
- Gestione connessioni multiple

### 9. `backend/src/controllers/spaziController.js`
**Descrizione**: Gestione spazi e disponibilità.

**Funzionalità**:
- Controllo disponibilità slot
- Gestione stati spazi
- Query ottimizzate

### 10. `backend/src/controllers/analyticsController.js`
**Descrizione**: Analisi e statistiche sistema.

**Funzionalità**:
- Metriche utilizzo
- Statistiche prenotazioni
- Report performance

---

## Route

### 1. `backend/src/routes/auth.js`
**Endpoint**:
- `POST /api/register`: Registrazione utente
- `POST /api/login`: Autenticazione utente

### 2. `backend/src/routes/catalogo.js`
**Endpoint**:
- `GET /api/sedi`: Lista sedi
- `GET /api/spazi`: Lista spazi
- `GET /api/servizi`: Lista servizi
- `GET /api/spazi/:id/servizi`: Servizi di uno spazio

### 3. `backend/src/routes/prenotazioni.js`
**Endpoint**:
- `GET /api/prenotazioni/disponibilita/:id`: Controllo disponibilità
- `POST /api/prenotazioni`: Crea prenotazione
- `GET /api/prenotazioni/utente`: Prenotazioni utente
- `PUT /api/prenotazioni/:id`: Aggiorna prenotazione

### 4. `backend/src/routes/pagamenti.js`
**Endpoint**:
- `POST /api/pagamenti/intent`: Crea intent pagamento
- `GET /api/pagamenti/storico`: Storico pagamenti
- `POST /api/pagamenti/rimborso`: Richiesta rimborso

### 5. `backend/src/routes/gestore.js`
**Endpoint**:
- `GET /api/gestore/dashboard`: Dashboard gestore
- `GET /api/gestore/prenotazioni`: Gestione prenotazioni
- `GET /api/gestore/statistiche`: Statistiche utilizzo

### 6. `backend/src/routes/scadenze.js`
**Endpoint**:
- `GET /api/scadenze/check`: Controllo scadenze
- `GET /api/scadenze/status`: Stato sistema scadenze
- `GET /api/scadenze/prenotazioni-scadute`: Prenotazioni scadute

### 7. `backend/src/routes/concorrenza.js`
**Endpoint**:
- `GET /api/concorrenza/spazi/:id/stato-concorrenza`: Stato concorrenza spazio

### 8. `backend/src/routes/sse.js`
**Endpoint**:
- `GET /api/sse/connect`: Connessione SSE
- `POST /api/sse/broadcast`: Broadcast messaggi

### 9. `backend/src/routes/spazi.js`
**Endpoint**:
- `GET /api/spazi/disponibilita`: Controllo disponibilità
- `GET /api/spazi/slot`: Slot disponibili

### 10. `backend/src/routes/webhook.js`
**Endpoint**:
- `POST /webhook/stripe`: Webhook Stripe per aggiornamenti pagamenti

### 11. `backend/src/routes/analytics.js`
**Endpoint**:
- `GET /api/analytics/overview`: Panoramica generale
- `GET /api/analytics/prenotazioni`: Statistiche prenotazioni
- `GET /api/analytics/performance`: Metriche performance

---

## Middleware

### 1. `backend/src/middleware/auth.js`
**Descrizione**: Autenticazione JWT per proteggere route.

**Funzionalità**:
- Verifica token JWT
- Estrazione dati utente
- Gestione errori autenticazione

### 2. `backend/src/middleware/sseAuth.js`
**Descrizione**: Autenticazione per connessioni SSE.

**Funzionalità**:
- Verifica token per SSE
- Gestione connessioni autenticate

---

## Servizi

### 1. `backend/src/services/scadenzeService.js`
**Descrizione**: Servizio per gestione automatica scadenze.

**Funzionalità**:
- Controllo prenotazioni in scadenza
- Aggiornamento stati automatico
- Notifiche e log

---

## Cron Jobs

### 1. `backend/src/cron/scadenzeCron.js`
**Descrizione**: Job schedulato per gestione scadenze.

**Funzionalità**:
- Esecuzione periodica controlli
- Aggiornamento stati prenotazioni
- Logging operazioni

---

## Database

### Schema Principale (`database/schema.sql`)

#### Tabella `Utente`
- `id_utente`: ID univoco utente
- `nome`, `cognome`: Dati personali
- `email`: Email univoca
- `password`: Password hashata
- `ruolo`: Cliente, gestore, amministratore
- `telefono`: Numero di contatto
- `stripe_customer_id`: ID cliente Stripe

#### Tabella `Sede`
- `id_sede`: ID univoco sede
- `nome`, `citta`, `indirizzo`: Dati sede
- `descrizione`: Descrizione opzionale
- `id_gestore`: Riferimento gestore

#### Tabella `Spazio`
- `id_spazio`: ID univoco spazio
- `id_sede`: Riferimento sede
- `nome`, `tipologia`: Caratteristiche spazio
- `descrizione`, `capienza`: Dettagli aggiuntivi

#### Tabella `Servizio`
- `id_servizio`: ID univoco servizio
- `nome`, `descrizione`: Dettagli servizio

#### Tabella `Spazio_Servizio`
- Tabella di collegamento spazi-servizi
- Relazione many-to-many

#### Tabella `Prenotazione`
- `id_prenotazione`: ID univoco prenotazione
- `id_utente`, `id_spazio`: Riferimenti
- `data_inizio`, `data_fine`: Intervallo prenotazione
- `stato`: Stato prenotazione (8 stati possibili)
- `scadenza_slot`: Scadenza slot temporale
- `data_pagamento`: Data pagamento

#### Tabella `Pagamento`
- `id_pagamento`: ID univoco pagamento
- `id_prenotazione`: Riferimento prenotazione
- `importo`: Importo pagamento
- `stato`: Stato pagamento
- `stripe_payment_intent_id`: ID intent Stripe
- Campi aggiuntivi per provider esterni

### Migrazioni e Fix

#### `database/migration-stripe.sql`
- Aggiunta campi Stripe alle tabelle esistenti
- Aggiornamento schema per integrazione pagamenti

#### `database/fix-*.sql`
- Correzioni vincoli e constraint
- Aggiornamenti schema per stabilità

---

## Script di Setup

### 1. `backend/setup-postgres.js`
**Descrizione**: Script per configurazione database PostgreSQL.

**Funzionalità**:
- Creazione database
- Creazione utenti
- Configurazione permessi
- Setup schema iniziale

### 2. `backend/init-db.js`
**Descrizione**: Inizializzazione database con dati di test.

**Funzionalità**:
- Creazione tabelle
- Inserimento dati seed
- Setup ambiente sviluppo

### 3. `backend/run-migration-stripe.js`
**Descrizione**: Esecuzione migrazioni Stripe.

**Funzionalità**:
- Aggiornamento schema per Stripe
- Migrazione dati esistenti

### 4. `backend/start-scadenze-service.js`
**Descrizione**: Avvio servizio gestione scadenze.

**Funzionalità**:
- Avvio processo scadenze
- Configurazione cron job
- Logging servizio

### 5. `backend/test-stripe.js`
**Descrizione**: Test integrazione Stripe.

**Funzionalità**:
- Verifica configurazione
- Test connessione API
- Validazione chiavi

---

## Configurazioni e Deployment

### `backend/CONFIGURAZIONE.md`
- Guida configurazione ambiente
- Variabili d'ambiente necessarie
- Setup database e servizi

### `backend/RENDER_SETUP.md`
- Configurazione deployment su Render
- Setup variabili ambiente
- Configurazione build

### `backend/WEBHOOK_SETUP.md`
- Configurazione webhook Stripe
- Setup endpoint
- Gestione eventi

---

## Caratteristiche Tecniche

### Sicurezza
- Autenticazione JWT
- Hashing password bcrypt
- Validazione input
- CORS configurato
- Rate limiting (da implementare)

### Performance
- Pool connessioni PostgreSQL
- Query ottimizzate
- Logging performance
- Cache layer (da implementare)

### Scalabilità
- Architettura modulare
- Separazione responsabilità
- Middleware configurabili
- Sistema eventi real-time

### Monitoraggio
- Logging dettagliato
- Endpoint di health check
- Metriche performance
- Debug endpoint

---

## Note di Sviluppo

### Best Practices Implementate
- Separazione controller/route/service
- Gestione errori centralizzata
- Logging strutturato
- Validazione input
- Configurazione centralizzata

### Aree di Miglioramento
- Implementazione rate limiting
- Sistema cache Redis
- Test unitari e integrazione
- Documentazione API OpenAPI
- Monitoraggio avanzato

### Dipendenze Critiche
- PostgreSQL per persistenza
- Stripe per pagamenti
- JWT per autenticazione
- Express per web framework

---

*Documentazione generata per il progetto CoWorking - Sistema di Gestione Spazi di Coworking*
