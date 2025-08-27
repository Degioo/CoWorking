# 🕐 Sistema di Gestione Scadenze Prenotazioni

## 📋 Panoramica

Il sistema di gestione scadenze gestisce automaticamente:
- **Prenotazioni scadute**: Prenotazioni con `data_fine < NOW()`
- **Pagamenti in sospeso**: Pagamenti non completati entro 15 minuti
- **Stati aggiornati**: Aggiornamento automatico degli stati nel database

## 🚀 Avvio del Sistema

### 1. Eseguire la Migrazione Stripe
```bash
cd backend
npm run migrate-stripe
```

### 2. Avviare il Servizio Scadenze
```bash
cd backend
npm run start-scadenze
```

### 3. Avviare il Backend Principale
```bash
cd backend
npm start
```

## ⚙️ Configurazione

### Intervalli di Controllo
- **Controllo scadenze**: Ogni 5 minuti (configurabile)
- **Timeout pagamenti**: 15 minuti per completare il pagamento
- **Controllo pre-scadenza**: 1 ora prima della scadenza

### Stati Prenotazione
- `pendente` → `scaduta` (quando scade)
- `in attesa` → `scaduta` (quando scade)
- `pagamento_fallito` → `scaduta` (quando scade)

### Stati Pagamento
- `in attesa` → `fallito` (dopo 15 minuti)
- `in sospeso` → `fallito` (dopo 15 minuti)

## 🔧 API Endpoints

### Controlli Scadenza (Admin/Gestore)
```http
POST /api/scadenze/check
```

### Statistiche Scadenze (Admin/Gestore)
```http
GET /api/scadenze/stats
```

### Prenotazioni Scadute Utente
```http
GET /api/scadenze/prenotazioni-scadute
```

### Prenotazioni in Scadenza Utente
```http
GET /api/scadenze/prenotazioni-in-scadenza
```

## 📊 Dashboard Utente

### Nuova Tab "Scadute"
- Mostra prenotazioni scadute
- Evidenzia che non sono più saldabili
- Visualizzazione chiara con badge rossi

### Aggiornamenti Tab "Prenotazioni"
- Colori diversi per stati diversi
- Riga rossa per prenotazioni scadute
- Riga gialla per pagamenti falliti
- Pulsanti appropriati per ogni stato

## 🎨 Miglioramenti UI

### Pulsante Homepage
- Colore più chiaro e visibile
- Gradiente blu più luminoso
- Ombreggiatura migliorata
- Testo con ombra per maggiore leggibilità

## 🔄 Funzionamento Automatico

### Controlli Eseguiti
1. **Prenotazioni scadute**: Aggiorna stato a 'scaduta'
2. **Pagamenti in sospeso**: Aggiorna stato a 'fallito'
3. **Prenotazioni in scadenza**: Monitora (entro 1 ora)

### Log del Sistema
```
🕐 Controllo scadenze automatico - 15/01/2025, 10:30:00
🔍 Controllo scadenze prenotazioni...
📅 Trovate 2 prenotazioni scadute
⏰ Prenotazione 123 marcata come scaduta
⏰ Prenotazione 124 marcata come scaduta
⏱️ Controllo pagamenti in sospeso...
⏰ Trovati 1 pagamenti in sospeso scaduti
💸 Pagamento 456 scaduto e marcato come fallito
⚠️ Controllo prenotazioni in scadenza...
✅ Controlli scadenza completati
```

## 🛠️ Manutenzione

### Riavvio Servizio
```bash
# Ferma il servizio (Ctrl+C)
# Riavvia
npm run start-scadenze
```

### Modifica Intervallo
```javascript
// Nel codice
scadenzeService.setCheckInterval(10); // 10 minuti
```

### Log e Debug
- Tutti i controlli sono loggati nella console
- Errori sono gestiti e loggati
- Statistiche disponibili via API

## 🔒 Sicurezza

### Accesso API
- Solo utenti autenticati possono accedere
- Solo admin/gestore possono eseguire controlli manuali
- Utenti normali possono solo visualizzare le proprie scadenze

### Validazione Dati
- Controlli di integrità sui timestamp
- Verifica stati validi prima degli aggiornamenti
- Rollback automatico in caso di errori

## 📈 Monitoraggio

### Metriche Disponibili
- Numero prenotazioni scadute
- Numero pagamenti falliti
- Prenotazioni in scadenza
- Timestamp ultimo controllo

### Alert e Notifiche
- Console logging per tutti gli eventi
- Statistiche disponibili via API
- Possibilità di integrare webhook per notifiche

## 🚨 Troubleshooting

### Problemi Comuni
1. **Servizio non si avvia**: Verificare connessione database
2. **Controlli non eseguiti**: Verificare log per errori
3. **Stati non aggiornati**: Verificare permessi database

### Debug
```bash
# Verifica stato servizio
curl -H "Authorization: Bearer TOKEN" /api/scadenze/stats

# Controllo manuale
curl -X POST -H "Authorization: Bearer TOKEN" /api/scadenze/check
```

## 🔮 Sviluppi Futuri

### Funzionalità Pianificate
- Notifiche email per scadenze imminenti
- Dashboard admin per gestione scadenze
- Configurazione dinamica degli intervalli
- Integrazione con sistemi di notifica esterni
- Report automatici periodici
