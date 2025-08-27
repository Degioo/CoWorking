# CoWorkSpace

Piattaforma per la gestione e prenotazione di spazi di coworking in Italia.

## Struttura del progetto

- `backend/` - API Express.js con PostgreSQL
- `frontend/` - Interfaccia utente (HTML, CSS, JS, Bootstrap, jQuery)
- `database/` - Schema e script SQL per PostgreSQL
- `devops/` - Script di deploy e configurazione cloud

## Prerequisiti

- Node.js (versione 14 o superiore)
- PostgreSQL (versione 12 o superiore)

## Setup PostgreSQL

### Opzione 1: Installazione locale
1. Scarica e installa PostgreSQL da [postgresql.org](https://www.postgresql.org/download/)
2. Durante l'installazione, imposta la password dell'utente `postgres` come `postgres`
3. Assicurati che PostgreSQL sia in esecuzione sulla porta 5432

### Opzione 2: Docker (se disponibile)
```bash
cd devops
docker-compose up -d
```

## Installazione e avvio

1. **Installa le dipendenze backend:**
   ```bash
   cd backend
   npm install
   ```

2. **Setup database PostgreSQL:**
   ```bash
   cd backend
   node setup-postgres.js
   ```

3. **Avvia il server backend:**
   ```bash
   cd backend
   npm start
   ```

4. **Apri il frontend:**
   - Apri `frontend/public/index.html` nel browser
   - Oppure avvia un server locale per il frontend

## Test del sistema

### Credenziali di test
- **Cliente**: `luca.bianchi@email.com` (password: qualsiasi)
- **Gestore**: `mario.rossi@email.com` (password: qualsiasi)

### Funzionalità da testare
1. **Home page** - Catalogo sedi con filtri
2. **Login/Registrazione** - Creazione account utente
3. **Prenotazione** - Wizard a 4 step per prenotare spazi
4. **Dashboard** - Gestione prenotazioni e report (per gestori)

### API disponibili
- `GET /api/ping` - Test server
- `GET /api/sedi` - Catalogo sedi
- `GET /api/spazi` - Catalogo spazi
- `POST /api/register` - Registrazione utente
- `POST /api/login` - Login utente
- `POST /api/prenotazioni` - Creazione prenotazione
- `GET /api/prenotazioni` - Visualizzazione prenotazioni
- `POST /api/pagamenti` - Registrazione pagamento
- `GET /api/gestore/*` - API dashboard gestore

## Tecnologie utilizzate

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5, jQuery
- **Database**: PostgreSQL con schema relazionale
- **Autenticazione**: bcrypt per hash password

## Deployment

Per il deployment in produzione:
1. Configura variabili d'ambiente per PostgreSQL
2. Usa un server web per servire i file statici del frontend
3. Configura HTTPS e sicurezza aggiuntiva
4. Implementa backup automatici del database 