# Configurazione Webhook Stripe

## 1. Configurazione su Stripe Dashboard

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Clicca su "Add endpoint"
3. Inserisci l'URL del tuo webhook: `https://tuodominio.com/webhook`
4. Seleziona gli eventi da ascoltare:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.created`
   - `customer.updated`

## 2. Configurazione Locale

### Variabili d'Ambiente
Crea un file `.env` nella cartella `backend` con:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_WsLhQ9QXBBUdppq2marA47aOewWctgi9
```

### Test Locale
Per testare localmente, usa Stripe CLI:

```bash
# Installa Stripe CLI
# Poi esegui:
stripe listen --forward-to localhost:3002/webhook
```

## 3. Endpoint Webhook

Il webhook è disponibile su: `POST /webhook`

### Eventi Gestiti

- **`payment_intent.succeeded`**: Aggiorna lo stato della prenotazione a "confermata"
- **`payment_intent.payment_failed`**: Aggiorna lo stato della prenotazione a "pagamento_fallito"
- **`charge.refunded`**: Aggiorna lo stato del pagamento a "rimborsato"
- **`customer.created`**: Log quando viene creato un nuovo cliente
- **`customer.updated`**: Log quando viene aggiornato un cliente

## 4. Sicurezza

- Il webhook verifica la firma di Stripe per autenticare le richieste
- Usa sempre HTTPS in produzione
- Il secret del webhook è configurato nel file `config/stripe.js`

## 5. Log e Debug

Tutti gli eventi webhook vengono loggati nella console del server. Controlla i log per:
- Eventi ricevuti
- Errori di elaborazione
- Aggiornamenti di stato delle prenotazioni

## 6. Troubleshooting

### Webhook non ricevuto
- Verifica che l'URL sia corretto su Stripe
- Controlla che il server sia in esecuzione
- Verifica i log del server

### Errori di firma
- Controlla che il webhook secret sia corretto
- Verifica che l'endpoint secret nel codice corrisponda a quello su Stripe

### Errori di database
- Verifica la connessione al database
- Controlla che le tabelle esistano e abbiano la struttura corretta

