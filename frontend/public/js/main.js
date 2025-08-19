// Configurazione API
// Configurazione API - usa quella globale da config.js

// Debug: verifica configurazione
console.log('main.js - window.CONFIG:', window.CONFIG);
console.log('main.js - API_BASE:', window.CONFIG.API_BASE);

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

// Logout locale - chiama la funzione centralizzata
function handleLogout() {
  // Usa la funzione centralizzata di config.js
  if (typeof window.logout === 'function') {
    window.logout();
  } else {
    // Fallback se la funzione non è disponibile
    localStorage.removeItem('user');
    location.reload();
  }
}

// Caricamento sedi
function loadSedi(citta = '') {
  console.log('Caricando sedi...', citta ? `Filtro: ${citta}` : 'Tutte');
  const url = citta ? `${window.CONFIG.API_BASE}/sedi?citta=${citta}` : `${window.CONFIG.API_BASE}/sedi`;

  $.ajax({
    url: url,
    method: 'GET'
    // Rimuovo headers per endpoint pubblico che non richiede autenticazione
  })
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
    url: `${window.CONFIG.API_BASE}/login`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data)
  })
    .done(function (response) {
      // Salva l'utente
      localStorage.setItem('user', JSON.stringify(response));
      showAlert('Login effettuato con successo!', 'success');

      // Controlla se c'è un redirect specifico salvato
      const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
      if (redirectAfterLogin) {
        // Rimuovi l'URL salvato e vai alla pagina originale
        localStorage.removeItem('redirectAfterLogin');
        console.log('handleLogin - Redirect alla pagina originale:', redirectAfterLogin);

        // Se il redirect è verso prenota.html, vai alla dashboard invece
        // perché prenota.html non richiede autenticazione
        if (redirectAfterLogin.includes('prenota.html')) {
          console.log('handleLogin - Redirect verso prenota.html, vado alla dashboard');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        } else {
          setTimeout(() => {
            window.location.href = redirectAfterLogin;
          }, 1000);
        }
        return;
      }

      // Controlla se c'è una prenotazione in attesa
      const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');
      if (pendingPrenotazione) {
        // Rimuovi i dati temporanei e vai direttamente al pagamento
        localStorage.removeItem('pendingPrenotazione');
        const prenotazioneData = JSON.parse(pendingPrenotazione);

        // Vai direttamente alla pagina di pagamento con i parametri della prenotazione
        const pagamentoUrl = new URL('pagamento.html', window.location.origin);
        pagamentoUrl.searchParams.set('sede', prenotazioneData.sede);
        pagamentoUrl.searchParams.set('spazio', prenotazioneData.spazio);
        pagamentoUrl.searchParams.set('dal', prenotazioneData.dataInizio);
        pagamentoUrl.searchParams.set('al', prenotazioneData.dataFine);

        setTimeout(() => {
          window.location.href = pagamentoUrl.toString();
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
    url: `${window.CONFIG.API_BASE}/register`,
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
        url: `${window.CONFIG.API_BASE}/login`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(loginData)
      })
        .done(function (loginResponse) {
          // Salva l'utente
          localStorage.setItem('user', JSON.stringify(loginResponse));

          // Controlla se c'è un redirect specifico salvato
          const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
          if (redirectAfterLogin) {
            // Rimuovi l'URL salvato e vai alla pagina originale
            localStorage.removeItem('redirectAfterLogin');
            console.log('handleRegistrazione - Redirect alla pagina originale:', redirectAfterLogin);

            // Se il redirect è verso prenota.html, vai alla dashboard invece
            // perché prenota.html non richiede autenticazione
            if (redirectAfterLogin.includes('prenota.html')) {
              console.log('handleRegistrazione - Redirect verso prenota.html, vado alla dashboard');
              setTimeout(() => {
                window.location.href = 'dashboard.html';
              }, 1500);
            } else {
              setTimeout(() => {
                window.location.href = redirectAfterLogin;
              }, 1500);
            }
            return;
          }

          // Controlla se c'è una prenotazione in attesa
          const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');
          if (pendingPrenotazione) {
            // Rimuovi i dati temporanei e vai direttamente al pagamento
            localStorage.removeItem('pendingPrenotazione');
            const prenotazioneData = JSON.parse(pendingPrenotazione);

            // Vai direttamente alla pagina di pagamento con i parametri della prenotazione
            const pagamentoUrl = new URL('pagamento.html', window.location.origin);
            pagamentoUrl.searchParams.set('sede', prenotazioneData.sede);
            pagamentoUrl.searchParams.set('spazio', prenotazioneData.spazio);
            pagamentoUrl.searchParams.set('dal', prenotazioneData.dataInizio);
            pagamentoUrl.searchParams.set('al', prenotazioneData.dataFine);

            setTimeout(() => {
              window.location.href = pagamentoUrl.toString();
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

  // Verifica validità token all'avvio
  validateTokenOnStartup().then(() => {
    // Aggiorna navbar se loggato (dopo la validazione)
    updateNavbar();
  });

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

// Inizializzazione quando il DOM è pronto
$(document).ready(function () {
  console.log('main.js - DOM ready, inizializzazione...');

  // Inizializza il sistema di toggle password
  setupPasswordToggles();

  // Inizializza i modali di login e registrazione
  setupAuthModals();

  // Inizializza la validazione dei form
  setupFormValidation();

  // Inizializza il sistema di notifiche
  if (window.modernUI) {
    window.modernUI.showToast('Benvenuto su Coworking Mio!', 'info');
  }
});

// ===== PASSWORD TOGGLE SYSTEM =====
function setupPasswordToggles() {
  // Toggle per login password
  const toggleLoginPassword = document.getElementById('toggleLoginPassword');
  const loginPassword = document.getElementById('loginPassword');
  const loginPasswordIcon = document.getElementById('loginPasswordIcon');

  if (toggleLoginPassword && loginPassword && loginPasswordIcon) {
    // Aggiungi attributi ARIA
    toggleLoginPassword.setAttribute('aria-label', 'Mostra password');
    toggleLoginPassword.setAttribute('type', 'button');
    toggleLoginPassword.setAttribute('tabindex', '0');

    toggleLoginPassword.addEventListener('click', () => {
      togglePasswordVisibility(loginPassword, loginPasswordIcon);
    });

    // Supporto per tastiera
    toggleLoginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(loginPassword, loginPasswordIcon);
      }
    });
  }

  // Toggle per registrazione password
  const toggleRegPassword = document.getElementById('toggleRegPassword');
  const regPassword = document.getElementById('regPassword');
  const regPasswordIcon = document.getElementById('regPasswordIcon');

  if (toggleRegPassword && regPassword && regPasswordIcon) {
    // Aggiungi attributi ARIA
    toggleRegPassword.setAttribute('aria-label', 'Mostra password');
    toggleRegPassword.setAttribute('type', 'button');
    toggleRegPassword.setAttribute('tabindex', '0');

    toggleRegPassword.addEventListener('click', () => {
      togglePasswordVisibility(regPassword, regPasswordIcon);
    });

    // Supporto per tastiera
    toggleRegPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(regPassword, regPasswordIcon);
      }
    });
  }

  // Toggle per conferma password
  const toggleRegConfirmPassword = document.getElementById('toggleRegConfirmPassword');
  const regConfirmPassword = document.getElementById('regConfirmPassword');
  const regConfirmPasswordIcon = document.getElementById('regConfirmPasswordIcon');

  if (toggleRegConfirmPassword && regConfirmPassword && regConfirmPasswordIcon) {
    // Aggiungi attributi ARIA
    toggleRegConfirmPassword.setAttribute('aria-label', 'Mostra password');
    toggleRegConfirmPassword.setAttribute('type', 'button');
    toggleRegConfirmPassword.setAttribute('tabindex', '0');

    toggleRegConfirmPassword.addEventListener('click', () => {
      togglePasswordVisibility(regConfirmPassword, regConfirmPasswordIcon);
    });

    // Supporto per tastiera
    toggleRegConfirmPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(regConfirmPassword, regConfirmPasswordIcon);
      }
    });
  }
}

// Funzione per toggle della visibilità password
function togglePasswordVisibility(passwordInput, iconElement) {
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    iconElement.className = 'fas fa-eye-slash';
    iconElement.title = 'Nascondi password';
    iconElement.setAttribute('aria-label', 'Nascondi password');
    // Aggiungi classe per styling
    passwordInput.parentElement.classList.add('password-visible');
  } else {
    passwordInput.type = 'password';
    iconElement.className = 'fas fa-eye';
    iconElement.title = 'Mostra password';
    iconElement.setAttribute('aria-label', 'Mostra password');
    // Rimuovi classe per styling
    passwordInput.parentElement.classList.remove('password-visible');
  }

  // Focus sul campo password per migliorare l'UX
  passwordInput.focus();
}

// Gestione specifica per la pagina login.html
function setupLoginPagePasswordToggles() {
  // Toggle per login password nella pagina login.html
  const toggleLoginPassword = document.getElementById('toggleLoginPassword');
  const loginPassword = document.getElementById('loginPassword');
  const loginPasswordIcon = document.getElementById('loginPasswordIcon');

  if (toggleLoginPassword && loginPassword && loginPasswordIcon) {
    // Aggiungi attributi ARIA
    toggleLoginPassword.setAttribute('aria-label', 'Mostra password');
    toggleLoginPassword.setAttribute('type', 'button');
    toggleLoginPassword.setAttribute('tabindex', '0');

    toggleLoginPassword.addEventListener('click', () => {
      togglePasswordVisibility(loginPassword, loginPasswordIcon);
    });

    // Supporto per tastiera
    toggleLoginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(loginPassword, loginPasswordIcon);
      }
    });
  }

  // Toggle per registrazione password nella pagina login.html
  const toggleRegPassword = document.getElementById('toggleRegPassword');
  const regPassword = document.getElementById('regPassword');
  const regPasswordIcon = document.getElementById('regPasswordIcon');

  if (toggleRegPassword && regPassword && regPasswordIcon) {
    // Aggiungi attributi ARIA
    toggleRegPassword.setAttribute('aria-label', 'Mostra password');
    toggleRegPassword.setAttribute('type', 'button');
    toggleRegPassword.setAttribute('tabindex', '0');

    toggleRegPassword.addEventListener('click', () => {
      togglePasswordVisibility(regPassword, regPasswordIcon);
    });

    // Supporto per tastiera
    toggleRegPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(regPassword, regPasswordIcon);
      }
    });
  }
}

// Inizializzazione specifica per la pagina login
if (document.getElementById('loginForm') && document.getElementById('registrazioneForm')) {
  // Siamo nella pagina login.html
  document.addEventListener('DOMContentLoaded', function () {
    console.log('Login page - inizializzazione toggle password...');
    setupLoginPagePasswordToggles();
  });
}

// Gestione per tutte le pagine che hanno campi password
document.addEventListener('DOMContentLoaded', function () {
  // Inizializza i toggle password per tutti i campi presenti
  setupPasswordToggles();

  // Inizializza anche per la pagina login se siamo lì
  if (document.getElementById('loginForm') && document.getElementById('registrazioneForm')) {
    setupLoginPagePasswordToggles();
  }

  // Migliora l'accessibilità dei campi password
  setupPasswordAccessibility();
});

// Funzione per migliorare l'accessibilità dei campi password
function setupPasswordAccessibility() {
  const passwordFields = document.querySelectorAll('input[type="password"]');

  passwordFields.forEach(field => {
    // Aggiungi aria-describedby se c'è un messaggio di errore
    const errorElement = field.parentElement.querySelector('.invalid-feedback');
    if (errorElement) {
      field.setAttribute('aria-describedby', errorElement.id);
    }

    // Aggiungi aria-invalid se il campo ha errori
    if (field.classList.contains('is-invalid')) {
      field.setAttribute('aria-invalid', 'true');
    }

    // Aggiungi aria-required se il campo è obbligatorio
    if (field.hasAttribute('required')) {
      field.setAttribute('aria-required', 'true');
    }

    // Aggiungi validazione in tempo reale
    field.addEventListener('input', () => validatePasswordField(field));
    field.addEventListener('blur', () => validatePasswordField(field));
  });
}

// Funzione per validare i campi password
function validatePasswordField(field) {
  const inputGroup = field.closest('.input-group');
  const errorElement = inputGroup.querySelector('.invalid-feedback');

  // Rimuovi stati precedenti
  inputGroup.classList.remove('is-valid', 'is-invalid');
  field.classList.remove('is-valid', 'is-invalid');

  // Validazione base
  if (field.hasAttribute('required') && !field.value.trim()) {
    showPasswordError(inputGroup, field, 'Questo campo è obbligatorio');
    return false;
  }

  // Validazione lunghezza minima
  if (field.value.length > 0 && field.value.length < 6) {
    showPasswordError(inputGroup, field, 'La password deve essere di almeno 6 caratteri');
    return false;
  }

  // Validazione per conferma password
  if (field.id === 'regConfirmPassword') {
    const passwordField = document.getElementById('regPassword');
    if (passwordField && field.value !== passwordField.value) {
      showPasswordError(inputGroup, field, 'Le password non coincidono');
      return false;
    }
  }

  // Se tutto è valido
  if (field.value.length > 0) {
    showPasswordSuccess(inputGroup, field);
    return true;
  }

  return true;
}

// Funzione per mostrare errori password
function showPasswordError(inputGroup, field, message) {
  inputGroup.classList.add('is-invalid');
  field.classList.add('is-invalid');
  field.setAttribute('aria-invalid', 'true');

  // Crea o aggiorna il messaggio di errore
  let errorElement = inputGroup.querySelector('.invalid-feedback');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'invalid-feedback';
    errorElement.id = `${field.id}-error`;
    inputGroup.appendChild(errorElement);
  }

  errorElement.textContent = message;
  field.setAttribute('aria-describedby', errorElement.id);
}

// Funzione per mostrare successo password
function showPasswordSuccess(inputGroup, field) {
  inputGroup.classList.add('is-valid');
  field.classList.add('is-valid');
  field.setAttribute('aria-invalid', 'false');

  // Rimuovi messaggi di errore
  const errorElement = inputGroup.querySelector('.invalid-feedback');
  if (errorElement) {
    errorElement.remove();
  }

  // Rimuovi aria-describedby se non ci sono errori
  if (!field.getAttribute('aria-describedby')) {
    field.removeAttribute('aria-describedby');
  }
} 