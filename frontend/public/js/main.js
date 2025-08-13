// Configurazione API
const API_BASE = window.CONFIG ? window.CONFIG.API_BASE : 'http://localhost:3002/api';

// Debug: verifica configurazione
console.log('main.js - window.CONFIG:', window.CONFIG);
console.log('main.js - API_BASE:', API_BASE);

// Funzioni di utilità
function showAlert(message, type = 'info') {
  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  $('body').prepend(alertHtml);
}

// Aggiorna navbar se utente è loggato
function updateNavbar() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    // Sostituisci i link Login/Registrati con info utente
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

// Logout
function logout() {
  localStorage.removeItem('user');
  location.reload();
}

// Caricamento sedi
function loadSedi(citta = '') {
  console.log('Caricando sedi...', citta ? `Filtro: ${citta}` : 'Tutte');
  const url = citta ? `${API_BASE}/sedi?citta=${citta}` : `${API_BASE}/sedi`;

  $.get(url)
    .done(function (sedi) {
      console.log('Sedi caricate:', sedi);
      displaySedi(sedi);
      populateCittaFilter(sedi);
    })
    .fail(function (xhr, status, error) {
      console.error('Errore caricamento sedi:', xhr, status, error);
      showAlert('Errore nel caricamento delle sedi', 'danger');
    });
}

// Visualizzazione sedi
function displaySedi(sedi) {
  const container = $('#catalogoSedi');
  container.empty();

  if (sedi.length === 0) {
    container.html('<div class="col-12 text-center"><p>Nessuna sede trovata</p></div>');
    return;
  }

  sedi.forEach(sede => {
    const card = `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${sede.nome}</h5>
            <p class="card-text"><strong>Città:</strong> ${sede.citta}</p>
            <p class="card-text"><strong>Indirizzo:</strong> ${sede.indirizzo}</p>
            <p class="card-text">${sede.descrizione || ''}</p>
            <button class="btn btn-primary btn-sm" onclick="viewSpazi(${sede.id_sede})">
              Vedi spazi
            </button>
          </div>
        </div>
      </div>
    `;
    container.append(card);
  });
}

// Popola filtro città
function populateCittaFilter(sedi) {
  const citta = [...new Set(sedi.map(s => s.citta))];
  const select = $('#filtroCitta');
  select.find('option:not(:first)').remove();

  citta.forEach(c => {
    select.append(`<option value="${c}">${c}</option>`);
  });
}

// Visualizza spazi di una sede
function viewSpazi(idSede) {
  // Per ora reindirizza a una pagina di prenotazione
  window.location.href = `prenota.html?sede=${idSede}`;
}

// Login
function handleLogin(event) {
  event.preventDefault();

  const data = {
    email: $('#loginEmail').val(),
    password: $('#loginPassword').val()
  };

  $.ajax({
    url: `${API_BASE}/login`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data)
  })
    .done(function (response) {
      localStorage.setItem('user', JSON.stringify(response));
      showAlert('Login effettuato con successo!', 'success');
      
      // Controlla se c'è una prenotazione in attesa
      const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');
      if (pendingPrenotazione) {
        // Rimuovi i dati temporanei e torna alla prenotazione
        localStorage.removeItem('pendingPrenotazione');
        const prenotazioneData = JSON.parse(pendingPrenotazione);
        
        // Ricostruisci l'URL con i parametri salvati
        const returnUrl = new URL(prenotazioneData.returnUrl);
        returnUrl.searchParams.set('sede', prenotazioneData.sede);
        returnUrl.searchParams.set('spazio', prenotazioneData.spazio);
        if (prenotazioneData.dataInizio) {
          returnUrl.searchParams.set('dal', prenotazioneData.dataInizio);
        }
        if (prenotazioneData.dataFine) {
          returnUrl.searchParams.set('al', prenotazioneData.dataFine);
        }
        
        setTimeout(() => {
          window.location.href = returnUrl.toString();
        }, 1000);
      } else {
        // Nessuna prenotazione in attesa, vai alla dashboard
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      }
    })
    .fail(function (xhr) {
      const error = xhr.responseJSON?.error || 'Errore durante il login';
      showAlert(error, 'danger');
    });
}

// Registrazione
function handleRegistrazione(event) {
  event.preventDefault();

  const data = {
    nome: $('#regNome').val(),
    cognome: $('#regCognome').val(),
    email: $('#regEmail').val(),
    password: $('#regPassword').val(),
    ruolo: $('#regRuolo').val(),
    telefono: $('#regTelefono').val() || null
  };

  $.ajax({
    url: `${API_BASE}/register`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data)
  })
    .done(function (response) {
      showAlert('Registrazione effettuata con successo! Ora effettuo il login automatico...', 'success');
      
      // Effettua login automatico dopo la registrazione
      const loginData = {
        email: data.email,
        password: data.password
      };
      
      $.ajax({
        url: `${API_BASE}/login`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(loginData)
      })
        .done(function (loginResponse) {
          localStorage.setItem('user', JSON.stringify(loginResponse));
          
          // Controlla se c'è una prenotazione in attesa
          const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');
          if (pendingPrenotazione) {
            // Rimuovi i dati temporanei e torna alla prenotazione
            localStorage.removeItem('pendingPrenotazione');
            const prenotazioneData = JSON.parse(pendingPrenotazione);
            
            // Ricostruisci l'URL con i parametri salvati
            const returnUrl = new URL(prenotazioneData.returnUrl);
            returnUrl.searchParams.set('sede', prenotazioneData.sede);
            returnUrl.searchParams.set('spazio', prenotazioneData.spazio);
            if (prenotazioneData.dataInizio) {
              returnUrl.searchParams.set('dal', prenotazioneData.dataInizio);
            }
            if (prenotazioneData.dataFine) {
              returnUrl.searchParams.set('al', prenotazioneData.dataFine);
            }
            
            setTimeout(() => {
              window.location.href = returnUrl.toString();
            }, 1500);
          } else {
            // Nessuna prenotazione in attesa, vai alla dashboard
            setTimeout(() => {
              window.location.href = 'dashboard.html';
            }, 1500);
          }
        })
        .fail(function (xhr) {
          const error = xhr.responseJSON?.error || 'Errore durante il login automatico';
          showAlert(error, 'danger');
          // Se il login automatico fallisce, mostra il tab di login
          $('#login-tab').tab('show');
        });
    })
    .fail(function (xhr) {
      const error = xhr.responseJSON?.error || 'Errore durante la registrazione';
      showAlert(error, 'danger');
    });
}

// Event handlers
$(document).ready(function () {
  console.log('DOM ready, inizializzazione...');

  // Aggiorna navbar se loggato
  updateNavbar();

  // Carica sedi all'avvio se siamo sulla home
  if ($('#catalogoSedi').length) {
    console.log('Elemento catalogoSedi trovato, carico le sedi...');
    loadSedi();
  }

  // Pulsante Catalogo (ricarica le sedi)
  $('#btnCatalogo').click(function (e) {
    e.preventDefault();
    console.log('Pulsante Catalogo cliccato');
    loadSedi();
    // Scroll verso il catalogo
    $('html, body').animate({
      scrollTop: $('#catalogoSedi').parent().offset().top
    }, 500);
  });

  // Filtro sedi
  $('#btnFiltra').click(function () {
    const citta = $('#filtroCitta').val();
    console.log('Filtro applicato:', citta);
    loadSedi(citta);
  });

  // Login form
  $('#loginForm').submit(handleLogin);

  // Registrazione form
  $('#registrazioneForm').submit(handleRegistrazione);

  // Gestione hash URL per tab registrazione
  if (window.location.hash === '#registrazione') {
    $('#registrazione-tab').tab('show');
  }
}); 