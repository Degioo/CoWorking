# Sistema di Pagamento CoWorking - Guida Completa

## 🎯 Panoramica

Questo sistema implementa un flusso completo di pagamento per prenotazioni coworking utilizzando **Stripe** come gateway di pagamento. Il sistema gestisce automaticamente l'autenticazione, la creazione di pagamenti e l'aggiornamento degli stati delle prenotazioni.

## 🏗️ Architettura del Sistema

### Frontend
- **Dashboard**: Mostra prenotazioni con pulsante "Paga Ora"
- **Pagina Pagamento**: Form di pagamento integrato con Stripe Elements
- **Gestione Stati**: Aggiornamento automatico dopo il pagamento

### Backend
- **API Pagamenti**: Creazione PaymentIntent e gestione pagamenti
- **Webhook Stripe**: Gestione automatica degli eventi di pagamento
- **Database**: Aggiornamento automatico degli stati

## 🚀 Flusso di Pagamento

### 1. **Dashboard Utente**
```
Utente → Visualizza Prenotazioni → Clicca "Paga Ora" → Reindirizzamento a Pagamento
```

### 2. **Pagina di Pagamento**
```
Pagamento → Inserimento Carta → Creazione PaymentIntent → Conferma Pagamento
```

### 3. **Gestione Automatica**
```
Stripe → Webhook → Aggiornamento Database → Conferma Prenotazione
```

## 📁 Struttura File

### Backend
```
backend/
├── src/
│   ├── controllers/
│   │   ├── pagamentiController.js    # Gestione pagamenti Stripe
│   │   └── prenotazioniController.js # Gestione prenotazioni
│   ├── routes/
│   │   ├── pagamenti.js             # API pagamenti
│   │   ├── prenotazioni.js          # API prenotazioni
│   │   └── webhook.js               # Webhook Stripe
│   └── app.js                       # Server principale
├── config/
│   ├── config.js                    # Configurazione centralizzata
│   └── stripe.js                    # Configurazione Stripe
└── WEBHOOK_SETUP.md                 # Setup webhook
```

### Frontend
```
frontend/
├── public/
│   ├── dashboard.html               # Dashboard utente
│   ├── pagamento.html              # Pagina pagamento
│   └── js/
│       ├── dashboard.js            # Logica dashboard
│       └── pagamento.js            # Logica pagamento
```

## ⚙️ Configurazione

### 1. **Variabili d'Ambiente**
Crea un file `.env` nella cartella `backend`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_WsLhQ9QXBBUdppq2marA47aOewWctgi9

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coworkspace
DB_USER=your_user
DB_PASSWORD=your_password

# Server
PORT=3002
NODE_ENV=development
```

### 2. **Configurazione Stripe Dashboard**
1. Vai su [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Crea un nuovo webhook endpoint
3. URL: `https://tuodominio.com/webhook`
4. Eventi da selezionare:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.created`
   - `customer.updated`

## 🔧 API Endpoints

### Pagamenti
- `POST /api/pagamenti/stripe/intent` - Crea PaymentIntent
- `POST /api/pagamenti/stripe/complete` - Conferma pagamento
- `GET /api/pagamenti/stripe/config` - Configurazione pubblica
- `GET /api/pagamenti/stripe/status/:id` - Stato pagamento

### Prenotazioni
- `GET /api/prenotazioni/:id` - Dettagli prenotazione
- `GET /api/prenotazioni?utente=:id` - Prenotazioni utente

### Webhook
- `POST /webhook` - Endpoint webhook Stripe

## 💳 Test del Sistema

### 1. **Carte di Test Stripe**
- **Successo**: `4242 4242 4242 4242`
- **Fallimento**: `4000 0000 0000 0002`
- **Richiede Autenticazione**: `4000 0025 0000 3155`

### 2. **Test Locale**
```bash
# Installa Stripe CLI
stripe listen --forward-to localhost:3002/webhook

# In un altro terminale, avvia il server
npm start
```

### 3. **Flusso di Test**
1. Accedi come utente
2. Crea una prenotazione
3. Clicca "Paga Ora" nella dashboard
4. Inserisci una carta di test
5. Verifica che la prenotazione sia confermata

## 🛡️ Sicurezza

### **Autenticazione**
- JWT token per le API
- Verifica autenticazione prima del pagamento
- Reindirizzamento al login se non autenticato

### **Webhook Stripe**
- Verifica firma webhook
- Gestione sicura degli eventi
- Logging completo per debugging

### **Dati Sensibili**
- Chiavi Stripe in variabili d'ambiente
- Nessun dato carta salvato localmente
- Comunicazione HTTPS in produzione

## 📊 Monitoraggio e Debug

### **Log del Server**
- Eventi webhook ricevuti
- Errori di pagamento
- Creazione PaymentIntent
- Aggiornamenti database

### **Stripe Dashboard**
- Pagamenti in tempo reale
- Eventi webhook
- Log errori e dispute

## 🚨 Troubleshooting

### **Webhook non ricevuto**
- Verifica URL endpoint su Stripe
- Controlla che il server sia in esecuzione
- Verifica i log del server

### **Errore autenticazione**
- Controlla JWT token
- Verifica scadenza token
- Controlla middleware autenticazione

### **Pagamento fallito**
- Verifica chiavi Stripe
- Controlla log errori
- Verifica configurazione webhook

## 🔄 Aggiornamenti e Manutenzione

### **Aggiornamento Stripe**
- Mantieni sempre l'ultima versione della libreria
- Monitora deprecazioni
- Testa in ambiente staging

### **Backup Database**
- Backup regolari delle tabelle pagamenti
- Backup configurazioni webhook
- Log degli eventi critici

## 📞 Supporto

Per problemi o domande:
1. Controlla i log del server
2. Verifica configurazione Stripe
3. Testa con carte di test
4. Controlla documentazione Stripe

---

**⚠️ Importante**: In produzione, usa sempre HTTPS e verifica che tutte le chiavi API siano sicure e non esposte nel codice frontend.
