# Sistema di Prenotazione CoWorkSpace

## 📋 Indice
1. [Panoramica Generale](#panoramica-generale)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Flusso di Prenotazione](#flusso-di-prenotazione)
4. [API Backend](#api-backend)
5. [Frontend Logic](#frontend-logic)
6. [Database Schema](#database-schema)
7. [Validazioni e Controlli](#validazioni-e-controlli)
8. [Gestione degli Stati](#gestione-degli-stati)

---

## 🎯 Panoramica Generale

Il sistema di prenotazione di CoWorkSpace permette agli utenti di:
- **Esplorare** sedi di coworking
- **Selezionare** spazi specifici (stanze private, postazioni, sale riunioni)
- **Verificare** disponibilità in tempo reale
- **Prenotare** con un wizard guidato a 4 step
- **Gestire** le proprie prenotazioni tramite dashboard

---

## 🏗️ Architettura del Sistema

### **Frontend (Vanilla JS + jQuery + Bootstrap)**
```
frontend/
├── public/
│   ├── index.html          # Homepage con catalogo sedi
│   ├── selezione-slot.html # Selezione slot e prenotazione
│   ├── dashboard.html      # Dashboard utente/gestore
│   ├── login.html          # Autenticazione
│   └── js/
│       ├── main.js         # Logica homepage
│       ├── selezione-slot.js # Logica selezione slot e prenotazione ⭐
│       └── dashboard.js    # Logica dashboard
```

### **Backend (Node.js + Express.js + PostgreSQL)**
```
backend/
├── src/
│   ├── app.js                    # Server principale
│   ├── db.js                     # Connessione PostgreSQL
│   ├── routes/
│   │   ├── auth.js               # Autenticazione
│   │   ├── catalogo.js           # Sedi/Spazi/Servizi
│   │   ├── prenotazioni.js       # Prenotazioni ⭐
│   │   ├── pagamenti.js          # Pagamenti
│   │   └── gestore.js            # Dashboard gestori
│   └── controllers/
│       ├── authController.js
│       ├── catalogoController.js
│       ├── prenotazioniController.js ⭐
│       ├── pagamentiController.js
│       └── gestoreController.js
```

---

## 🔄 Flusso di Prenotazione

### **1. Entrypoint: Homepage**
```javascript
// In index.html
function viewSpazi(idSede) {
  window.location.href = `selezione-slot.html?sede=${idSede}`;
}
```

L'utente clicca "Vedi spazi" su una sede → viene reindirizzato a `selezione-slot.html?sede=X`

### **2. Inizializzazione Wizard**
```javascript
// In selezione-slot.js
$(document).ready(function() {
  updateNavbar();           // Aggiorna navbar se loggato
  loadSedi();              // Carica tutte le sedi
  setupEventHandlers();    // Imposta event listeners
  
  // Preseleziona sede dall'URL
  const urlParams = new URLSearchParams(window.location.search);
  const sedeId = urlParams.get('sede');
  if (sedeId) {
    setTimeout(() => {
      $('#selectSede').val(sedeId);
      onSedeChange();        // Passa automaticamente allo Step 2
    }, 500);
  }
});
```

### **3. Wizard a 4 Step**

#### **Step 1: Selezione Sede**
- Dropdown con tutte le sedi disponibili
- Se viene dall'homepage, la sede è preselezionata
- Al cambio sede → carica gli spazi di quella sede

#### **Step 2: Selezione Spazio**
```javascript
function loadSpazi(idSede) {
  $.get(`${API_BASE}/spazi?id_sede=${idSede}`)
    .done(function(spazi) {
      // Popola dropdown spazi
      spazi.forEach(spazio => {
        select.append(`<option value="${spazio.id_spazio}">
          ${spazio.nome} (${spazio.tipologia})
        </option>`);
      });
    });
}
```
- Al cambio spazio → carica i servizi inclusi

#### **Step 3: Selezione Date**
```javascript
function validateDates() {
  const inizio = new Date(dataInizio);
  const fine = new Date(dataFine);
  
  // Validazioni:
  if (inizio < now) return { valid: false, message: 'Data nel passato' };
  if (fine <= inizio) return { valid: false, message: 'Data fine prima inizio' };
  if (diffHours < 1) return { valid: false, message: 'Minimo 1 ora' };
  if (diffHours > 168) return { valid: false, message: 'Massimo 7 giorni' };
  
  return { valid: true };
}
```

**Pulsante "Avanti" intelligente:**
```javascript
function updateNavigationButtons() {
  if (currentStep === 3) {
    if (disponibilitaVerificata) {
      btnAvanti.prop('disabled', false).text('Avanti →');
    } else {
      btnAvanti.prop('disabled', true).text('Verifica disponibilità prima');
    }
  }
}
```

#### **Step 4: Conferma**
- Riepilogo della prenotazione
- Clic "Conferma" → chiamata API → redirect a dashboard

---

## 🔗 API Backend

### **Endpoint Principali**

#### **1. Catalogo**
```javascript
GET /api/sedi              // Tutte le sedi
GET /api/spazi?id_sede=X   // Spazi di una sede
GET /api/spazi/X/servizi   // Servizi di uno spazio
```

#### **2. Disponibilità**
```javascript
GET /api/spazi/X/disponibilita?data_inizio=...&data_fine=...
```

**Implementazione:**
```javascript
exports.checkDisponibilita = async (req, res) => {
  const { id } = req.params;
  const { data_inizio, data_fine } = req.query;
  
  const result = await pool.query(
    `SELECT COUNT(*) FROM Prenotazione
     WHERE id_spazio = $1 AND stato = 'confermata'
       AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
    [id, data_inizio, data_fine]
  );
  
  const disponibile = result.rows[0].count === '0';
  res.json({ disponibile });
};
```

#### **3. Creazione Prenotazione**
```javascript
POST /api/prenotazioni
{
  "id_utente": 123,
  "id_spazio": 456,
  "data_inizio": "2024-01-15T10:00",
  "data_fine": "2024-01-15T18:00"
}
```

**Implementazione:**
```javascript
exports.creaPrenotazione = async (req, res) => {
  const { id_utente, id_spazio, data_inizio, data_fine } = req.body;
  
  // 1. Controllo disponibilità
  const check = await pool.query(/*...controllo overlaps...*/);
  if (check.rows[0].count !== '0') {
    return res.status(409).json({ error: 'Spazio non disponibile' });
  }
  
  // 2. Inserimento prenotazione
  const result = await pool.query(
    `INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato)
     VALUES ($1, $2, $3, $4, 'confermata') RETURNING id_prenotazione`,
    [id_utente, id_spazio, data_inizio, data_fine]
  );
  
  res.status(201).json({ 
    message: 'Prenotazione creata', 
    id_prenotazione: result.rows[0].id_prenotazione 
  });
};
```

---

## 🗄️ Database Schema

### **Tabelle Principali**
```sql
-- Sedi di coworking
CREATE TABLE Sede (
    id_sede SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    citta TEXT NOT NULL,
    indirizzo TEXT NOT NULL,
    descrizione TEXT,
    id_gestore INTEGER REFERENCES Utente(id_utente)
);

-- Spazi all'interno delle sedi
CREATE TABLE Spazio (
    id_spazio SERIAL PRIMARY KEY,
    id_sede INTEGER NOT NULL REFERENCES Sede(id_sede),
    nome TEXT NOT NULL,
    tipologia TEXT NOT NULL CHECK (tipologia IN ('stanza privata', 'postazione', 'sala riunioni')),
    descrizione TEXT,
    capienza INTEGER
);

-- Prenotazioni
CREATE TABLE Prenotazione (
    id_prenotazione SERIAL PRIMARY KEY,
    id_utente INTEGER NOT NULL REFERENCES Utente(id_utente),
    id_spazio INTEGER NOT NULL REFERENCES Spazio(id_spazio),
    data_inizio TIMESTAMP NOT NULL,
    data_fine TIMESTAMP NOT NULL,
    stato TEXT NOT NULL CHECK (stato IN ('confermata', 'annullata', 'completata'))
);
```

### **Query Chiave per Disponibilità**
```sql
-- Controlla se uno spazio è libero in un intervallo
SELECT COUNT(*) FROM Prenotazione
WHERE id_spazio = ?
  AND stato = 'confermata'
  AND (data_inizio, data_fine) OVERLAPS (?, ?);
  
-- Se COUNT = 0 → spazio disponibile
-- Se COUNT > 0 → spazio occupato
```

---

## ✅ Validazioni e Controlli

### **Frontend (Immediate)**
```javascript
function validateDates() {
  const now = new Date();
  const inizio = new Date(dataInizio);
  const fine = new Date(dataFine);
  
  // 1. Data nel passato
  if (inizio < now) return { valid: false, message: 'Data nel passato' };
  
  // 2. Data fine prima dell'inizio
  if (fine <= inizio) return { valid: false, message: 'Ordine date errato' };
  
  // 3. Durata minima/massima
  const diffHours = (fine - inizio) / (1000 * 60 * 60);
  if (diffHours < 1) return { valid: false, message: 'Minimo 1 ora' };
  if (diffHours > 168) return { valid: false, message: 'Massimo 7 giorni' };
  
  return { valid: true };
}
```

### **Backend (Sicurezza)**
```javascript
// 1. Validazione campi obbligatori
if (!id_utente || !id_spazio || !data_inizio || !data_fine) {
  return res.status(400).json({ error: 'Campi obbligatori mancanti' });
}

// 2. Controllo double-booking
const check = await pool.query(/*...query overlaps...*/);
if (check.rows[0].count !== '0') {
  return res.status(409).json({ error: 'Spazio non disponibile' });
}
```

---

## 🎛️ Gestione degli Stati

### **Stati del Wizard**
```javascript
let currentStep = 1;                    // Step corrente (1-4)
let selectedSede = null;                // ID sede selezionata
let selectedSpazio = null;              // ID spazio selezionato
let selectedDataInizio = null;          // Data/ora inizio
let selectedDataFine = null;            // Data/ora fine
let disponibilitaVerificata = false;    // Flag verifica effettuata
```

### **Transizioni di Stato**
```javascript
// Step 1 → 2: Selezione sede
$('#selectSede').change(() => {
  selectedSede = $(this).val();
  loadSpazi(selectedSede);
  showStep(2);
});

// Step 2 → 3: Selezione spazio
$('#selectSpazio').change(() => {
  selectedSpazio = $(this).val();
  loadServiziSpazio(selectedSpazio);
  showStep(3);
});

// Step 3 → 4: Verifica disponibilità
checkDisponibilita() // Se disponibile → showStep(4)

// Step 4: Conferma → Creazione prenotazione
```

### **Reset degli Stati**
```javascript
// Quando cambio step, reset flag disponibilità
if (step !== 3) {
  disponibilitaVerificata = false;
}

// Quando cambio date, reset verifica
$('#dataInizio, #dataFine').change(() => {
  disponibilitaVerificata = false;
  $('#disponibilitaStatus').html('');
  updateNavigationButtons();
});
```

---

## 🔧 Funzionalità Avanzate

### **1. Navbar Dinamica**
```javascript
function updateNavbar() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    // Sostituisce "Login" con "Nome Cognome | Dashboard | Logout"
    $('.navbar-nav').last().html(`
      <li class="nav-item">
        <span class="nav-link text-light">${user.nome} ${user.cognome}</span>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="dashboard.html">Dashboard</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="#" onclick="logout()">Logout</a>
      </li>
    `);
  }
}
```

### **2. Prenotazione Senza Refresh**
```javascript
function createPrenotazione() {
  $.ajax({
    url: `${API_BASE}/prenotazioni`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data)
  })
  .done(() => {
    showAlert('Prenotazione creata!', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);
  });
}
```

### **3. Gestione Errori CORS**
```javascript
// Backend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'null'],
  credentials: true
}));
```

---

## 🚀 Deploy e Testing

### **Avvio Sistema**
```bash
# 1. Database
cd backend
node setup-postgres.js

# 2. Server
npm start

# 3. Frontend (server locale)
cd ../frontend/public
python -m http.server 8000
```

### **Test Manuali**
1. **Homepage** → Clicca "Vedi spazi" → Verifica preselzione sede
2. **Wizard** → Testa validazione date e pulsante "Avanti"
3. **Disponibilità** → Verifica controllo sovrapposizioni
4. **Prenotazione** → Conferma e verifica salvataggio
5. **Dashboard** → Verifica visualizzazione prenotazioni

---

## 📝 Note per il Collega

### **Punti di Attenzione**
1. **CORS**: Necessario per chiamate AJAX da file HTML locali
2. **Validazione Doppia**: Frontend (UX) + Backend (sicurezza)
3. **Stati Complessi**: Molte variabili globali da gestire
4. **Date**: Fuso orario e formati da controllare
5. **Sessioni**: localStorage per semplicità (migliorabile con JWT)

### **Possibili Miglioramenti**
- [ ] Autenticazione JWT invece di localStorage
- [ ] WebSocket per disponibilità in tempo reale
- [ ] Cache per sedi/spazi
- [ ] Paginazione per prenotazioni
- [ ] Calendario visuale per date
- [ ] Push notifications per conferme

---

**🎯 Questa documentazione copre tutto il flusso di prenotazione. Per domande specifiche, controlla il codice nei file evidenziati con ⭐** 