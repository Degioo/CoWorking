// Configurazione API
const API_BASE = window.CONFIG ? window.CONFIG.API_BASE : 'http://localhost:3002/api';

// Variabili globali
let currentUser = null;
let currentStep = 1;

// Inizializzazione dashboard
$(document).ready(function () {
  // Verifica validità token all'avvio
  validateTokenOnStartup().then(() => {
    checkAuth();
    setupEventHandlers();
  });
});

// Controllo autenticazione
function checkAuth() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = JSON.parse(userStr);
  setupDashboard();
}

// Logout
function logout() {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// Setup dashboard basato sul ruolo
function setupDashboard() {
  updateUserInfo();
  createTabs();
  loadInitialData();
}

// Aggiorna info utente nella navbar
function updateUserInfo() {
  $('#userInfo').text(`${currentUser.nome} ${currentUser.cognome} (${currentUser.ruolo})`);
  $('#welcomeTitle').text(`Benvenuto, ${currentUser.nome}!`);
}

// Crea tab dinamici basati sul ruolo
function createTabs() {
  const tabsContainer = $('#dashboardTabs');
  const contentContainer = $('#dashboardTabsContent');

  if (currentUser.ruolo === 'gestore') {
    // Tab per gestore
    tabsContainer.html(`
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="sedi-tab" data-bs-toggle="tab" data-bs-target="#sedi" type="button" role="tab">
          Le mie sedi
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="prenotazioni-tab" data-bs-toggle="tab" data-bs-target="#prenotazioni" type="button" role="tab">
          Prenotazioni
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="report-tab" data-bs-toggle="tab" data-bs-target="#report" type="button" role="tab">
          Report
        </button>
      </li>
    `);

    contentContainer.html(`
      <div class="tab-pane fade show active" id="sedi" role="tabpanel">
        <div id="sediContent">Caricamento...</div>
      </div>
      <div class="tab-pane fade" id="prenotazioni" role="tabpanel">
        <div id="prenotazioniContent">Caricamento...</div>
      </div>
      <div class="tab-pane fade" id="report" role="tabpanel">
        <div id="reportContent">Caricamento...</div>
      </div>
    `);
  } else {
    // Tab per cliente
    tabsContainer.html(`
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="prenotazioni-tab" data-bs-toggle="tab" data-bs-target="#prenotazioni" type="button" role="tab">
          Le mie prenotazioni
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="pagamenti-tab" data-bs-toggle="tab" data-bs-target="#pagamenti" type="button" role="tab">
          I miei pagamenti
        </button>
      </li>
    `);

    contentContainer.html(`
      <div class="tab-pane fade show active" id="prenotazioni" role="tabpanel">
        <div id="prenotazioniContent">Caricamento...</div>
      </div>
      <div class="tab-pane fade" id="pagamenti" role="tabpanel">
        <div id="pagamentiContent">Caricamento...</div>
      </div>
    `);
  }
}

// Carica dati iniziali
function loadInitialData() {
  if (currentUser.ruolo === 'gestore') {
    loadSediGestore();
    loadPrenotazioniGestore();
    loadReportGestore();
  } else {
    loadPrenotazioniUtente();
    loadPagamentiUtente();
  }
}

// Carica sedi del gestore
function loadSediGestore() {
  $.get(`${API_BASE}/gestore/sedi?id_gestore=${currentUser.id_utente}`)
    .done(function (sedi) {
      displaySediGestore(sedi);
    })
    .fail(function () {
      $('#sediContent').html('<div class="alert alert-danger">Errore nel caricamento delle sedi</div>');
    });
}

// Visualizza sedi del gestore
function displaySediGestore(sedi) {
  const container = $('#sediContent');
  if (sedi.length === 0) {
    container.html('<p>Nessuna sede gestita</p>');
    return;
  }

  let html = '<div class="row">';
  sedi.forEach(sede => {
    html += `
      <div class="col-md-6 mb-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">${sede.nome}</h5>
            <p class="card-text"><strong>Città:</strong> ${sede.citta}</p>
            <p class="card-text"><strong>Indirizzo:</strong> ${sede.indirizzo}</p>
            <button class="btn btn-primary btn-sm" onclick="viewSpaziSede(${sede.id_sede})">
              Gestisci spazi
            </button>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.html(html);
}

// Carica prenotazioni gestore
function loadPrenotazioniGestore() {
  $.get(`${API_BASE}/gestore/prenotazioni?id_gestore=${currentUser.id_utente}`)
    .done(function (prenotazioni) {
      displayPrenotazioniGestore(prenotazioni);
    })
    .fail(function () {
      $('#prenotazioniContent').html('<div class="alert alert-danger">Errore nel caricamento delle prenotazioni</div>');
    });
}

// Visualizza prenotazioni gestore
function displayPrenotazioniGestore(prenotazioni) {
  const container = $('#prenotazioniContent');
  if (prenotazioni.length === 0) {
    container.html('<p>Nessuna prenotazione trovata</p>');
    return;
  }

  let html = '<div class="table-responsive"><table class="table table-striped">';
  html += '<thead><tr><th>Data</th><th>Sede</th><th>Spazio</th><th>Stato</th></tr></thead><tbody>';

  prenotazioni.forEach(p => {
    const dataInizio = new Date(p.data_inizio).toLocaleString('it-IT');
    html += `
      <tr>
        <td>${dataInizio}</td>
        <td>${p.nome_sede}</td>
        <td>${p.nome_spazio}</td>
        <td><span class="badge bg-${getStatusColor(p.stato)}">${p.stato}</span></td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.html(html);
}

// Carica report gestore
function loadReportGestore() {
  $.get(`${API_BASE}/gestore/report?id_gestore=${currentUser.id_utente}`)
    .done(function (report) {
      displayReportGestore(report);
    })
    .fail(function () {
      $('#reportContent').html('<div class="alert alert-danger">Errore nel caricamento del report</div>');
    });
}

// Visualizza report gestore
function displayReportGestore(report) {
  const container = $('#reportContent');
  if (report.length === 0) {
    container.html('<p>Nessun dato disponibile</p>');
    return;
  }

  let html = '<div class="table-responsive"><table class="table table-striped">';
  html += '<thead><tr><th>Sede</th><th>Spazio</th><th>Prenotazioni</th><th>Incasso</th></tr></thead><tbody>';

  report.forEach(r => {
    html += `
      <tr>
        <td>${r.nome_sede}</td>
        <td>${r.nome_spazio}</td>
        <td>${r.num_prenotazioni}</td>
        <td>€${r.incasso_totale}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.html(html);
}

// Carica prenotazioni utente
function loadPrenotazioniUtente() {
  $.get(`${API_BASE}/prenotazioni?utente=${currentUser.id_utente}`)
    .done(function (prenotazioni) {
      displayPrenotazioniUtente(prenotazioni);
    })
    .fail(function () {
      $('#prenotazioniContent').html('<div class="alert alert-danger">Errore nel caricamento delle prenotazioni</div>');
    });
}

// Visualizza prenotazioni utente
function displayPrenotazioniUtente(prenotazioni) {
  const container = $('#prenotazioniContent');
  if (prenotazioni.length === 0) {
    container.html('<p>Nessuna prenotazione trovata</p>');
    return;
  }

  let html = '<div class="table-responsive"><table class="table table-striped">';
  html += '<thead><tr><th>Data</th><th>Sede</th><th>Spazio</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>';

  prenotazioni.forEach(p => {
    const dataInizio = new Date(p.data_inizio).toLocaleString('it-IT');
    const dataFine = new Date(p.data_fine);
    const dataInizioObj = new Date(p.data_inizio);
    const durataOre = Math.round((dataFine - dataInizioObj) / (1000 * 60 * 60));
    const importo = durataOre * 10; // 10€/ora

    // Determina se mostrare il pulsante di pagamento
    let azioniHtml = '';
    if (p.stato === 'in attesa' || p.stato === 'pendente') {
      azioniHtml = `
        <button class="btn btn-success btn-sm" onclick="pagaPrenotazione(${p.id_prenotazione})">
          💳 Paga Ora (€${importo.toFixed(2)})
        </button>
      `;
    } else if (p.stato === 'confermata') {
      azioniHtml = '<span class="badge bg-success">✅ Pagato</span>';
    } else {
      azioniHtml = '<span class="text-muted">-</span>';
    }

    html += `
      <tr>
        <td>${dataInizio}</td>
        <td>${p.nome_sede}</td>
        <td>${p.nome_spazio}</td>
        <td><span class="badge bg-${getStatusColor(p.stato)}">${p.stato}</span></td>
        <td>${azioniHtml}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.html(html);
}

// Carica pagamenti utente
function loadPagamentiUtente() {
  $.get(`${API_BASE}/pagamenti?utente=${currentUser.id_utente}`)
    .done(function (pagamenti) {
      displayPagamentiUtente(pagamenti);
    })
    .fail(function () {
      $('#pagamentiContent').html('<div class="alert alert-danger">Errore nel caricamento dei pagamenti</div>');
    });
}

// Visualizza pagamenti utente
function displayPagamentiUtente(pagamenti) {
  const container = $('#pagamentiContent');
  if (pagamenti.length === 0) {
    container.html('<p>Nessun pagamento trovato</p>');
    return;
  }

  let html = '<div class="table-responsive"><table class="table table-striped">';
  html += '<thead><tr><th>Data</th><th>Importo</th><th>Stato</th></tr></thead><tbody>';

  pagamenti.forEach(p => {
    const dataPagamento = new Date(p.data_pagamento).toLocaleString('it-IT');
    html += `
      <tr>
        <td>${dataPagamento}</td>
        <td>€${p.importo}</td>
        <td><span class="badge bg-${getPaymentStatusColor(p.stato)}">${p.stato}</span></td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.html(html);
}

// Utility functions
function getStatusColor(stato) {
  switch (stato) {
    case 'confermata': return 'success';
    case 'annullata': return 'danger';
    case 'completata': return 'info';
    default: return 'secondary';
  }
}

function getPaymentStatusColor(stato) {
  switch (stato) {
    case 'pagato': return 'success';
    case 'in attesa': return 'warning';
    case 'rimborsato': return 'info';
    default: return 'secondary';
  }
}

// Event handlers
function setupEventHandlers() {
  $('#btnLogout').click(function () {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  });
}

// Funzioni globali
function viewSpaziSede(idSede) {
  // Per ora mostra un alert, in futuro potrebbe aprire una modal
  alert(`Gestione spazi per sede ${idSede} - Funzionalità in sviluppo`);
}

// Funzione per avviare il pagamento di una prenotazione
function pagaPrenotazione(idPrenotazione) {
  // Verifica che l'utente sia autenticato
  if (!currentUser) {
    alert('Devi essere autenticato per procedere al pagamento');
    return;
  }

  // Reindirizza alla pagina di pagamento
  window.location.href = `pagamento.html?id=${idPrenotazione}`;
} 