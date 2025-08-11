# Progetto: CoWorkSpace – Piattaforma di prenotazione spazi condivisi

## Obiettivo
Sviluppare una piattaforma web full-stack per la gestione di spazi coworking distribuiti in varie città. La piattaforma dovrà consentire a diversi tipi di utenti (clienti, gestori, amministratori) di interagire in maniera fluida ed efficiente attraverso funzionalità di esplorazione sedi, gestione profili, prenotazioni, pagamento online, e amministrazione.

## Funzionalità Core

### 1. Catalogo delle Sedi
- Esplorazione sedi coworking tramite mappa o lista.
- Filtri avanzati: città, tipo spazio (ufficio privato, postazione flessibile, sala riunioni), servizi (Wi-Fi, stampante, caffè, ecc.), disponibilità in tempo reale.

### 2. Gestione Account
- Registrazione e login con validazione credenziali.
- Profilo utente con cronologia prenotazioni e impostazioni personali.
- Tre ruoli: Cliente, Gestore, Amministratore.

### 3. Prenotazione e Pagamento
- Calendario interattivo con disponibilità in tempo reale.
- Selezione e prenotazione spazio coworking.
- Integrazione sistema di pagamento sicuro online.
- Notifiche automatiche via email/push per conferme e reminder.

### 4. Dashboard per Gestori
- Visualizzazione prenotazioni giornaliere/settimanali.
- Gestione disponibilità spazi.
- Generazione di report riepilogativi (occupazione, fatturato, feedback).

### 5. Deployment Cloud
- Hosting cloud-based (AWS, GCP o simili).
- CI/CD pipeline e autoscaling per garantire continuità e affidabilità del servizio.

---

## Stack Tecnologico

> **Vincoli obbligatori:**  
> ✅ È **ammesso** l'uso solo di:
> - jQuery.js  
> - Bootstrap.js  
> - Express.js  
> ❌ Nessun altro framework JS è consentito (es. React, Angular, Vue sono vietati)

### Frontend
- HTML5, CSS3, JavaScript
- jQuery per interazioni dinamiche
- Bootstrap per layout responsivi

### Backend
- Node.js con Express.js
- RESTful API
- Gestione middleware per autenticazione, error handling, logging

### Database
- PostgreSQL o MySQL
- Relazioni: utenti, sedi, disponibilità, prenotazioni, pagamenti
- ER Diagram + Script SQL CRUD

### DevOps
- Containerizzazione con Docker
- CI/CD workflow GitHub Actions
- Deploy su AWS/GCP (Elastic Beanstalk, App Engine, o simili)

---

## Struttura del Repository Git

- `frontend/`: interfaccia utente e assets
- `backend/`: API, logica server, gestione utenti/prenotazioni
- `database/`: schema ER, script SQL, migrazioni
- `devops/`: Dockerfile, workflow CI/CD, script deploy
- `README.md`: istruzioni setup e documentazione tecnica

---

## Consegne Finali

- ✅ Repository Git completo, organizzato per branch
- ✅ README tecnico con guida deploy e configurazione ambienti
- ✅ Video demo o sessione live della piattaforma funzionante su cloud
- ✅ Test automatici unitari e di integrazione
- ✅ Documentazione completa: API, ER, gestione errori, rollback

---

## KPI Tecnici (per autovalutazione e milestone)
- [ ] Funzionalità complete (prenotazioni, sedi, dashboard, pagamenti)
- [ ] UI responsive e compatibile cross-browser
- [ ] Sicurezza e protezione dati (password hashing, HTTPS, validazione input)
- [ ] Scalabilità e uptime garantiti dal deploy cloud
- [ ] Copertura di test e documentazione ≥ 90%

