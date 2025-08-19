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
  console.log('Aggiornamento navbar...');
  const userStr = localStorage.getItem('user');
  
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log('Utente autenticato:', user.nome, user.cognome);
      
      // Sostituisci i link Login/Registrati con info utente
      $('.navbar-nav').last().html(`
        <li class="nav-item">
          <span class="nav-link text-light">
            <i class="fas fa-user me-2"></i>${user.nome} ${user.cognome}
            <small class="d-block text-muted">${user.ruolo}</small>
          </span>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" onclick="navigateToProtectedPage('dashboard.html')">
            <i class="fas fa-tachometer-alt me-2"></i>Dashboard
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" onclick="logout()">
            <i class="fas fa-sign-out-alt me-2"></i>Logout
          </a>
        </li>
      `);
    } catch (error) {
      console.error('Errore parsing user:', error);
      localStorage.removeItem('user');
      showDefaultNavbar();
    }
  } else {
    console.log('Nessun utente autenticato');
    showDefaultNavbar();
  }
}

// Mostra navbar di default per utenti non autenticati
function showDefaultNavbar() {
  $('.navbar-nav').last().html(`
    <li class="nav-item">
      <a class="nav-link" href="login.html">
        <i class="fas fa-sign-in-alt me-2"></i>Login
      </a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="login.html#registrazione">
        <i class="fas fa-user-plus me-2"></i>Registrati
      </a>
    </li>
  `);
}

// Funzione per navigare alle pagine protette verificando l'autenticazione
function navigateToProtectedPage(pageUrl) {
  console.log('Tentativo di navigazione a:', pageUrl);
  
  // Verifica se l'utente è autenticato
  if (typeof window.isAuthenticated === 'function' && window.isAuthenticated()) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('Utente autenticato:', user.nome, user.cognome, 'Ruolo:', user.ruolo);
        
        // Verifica permessi per pagine specifiche
        if (pageUrl.includes('dashboard-responsabili.html') && user.ruolo !== 'gestore' && user.ruolo !== 'amministratore') {
          showAlert('Non hai i permessi per accedere a questa pagina. Solo gestori e amministratori possono accedere.', 'warning');
          return;
        }
        
        console.log('Navigazione consentita a:', pageUrl);
        window.location.href = pageUrl;
      } catch (error) {
        console.error('Errore parsing user:', error);
        localStorage.removeItem('user');
        showAlert('Errore nei dati utente. Effettua nuovamente il login.', 'danger');
        window.location.href = 'login.html';
      }
    } else {
      console.log('Utente non autenticato, reindirizzamento al login');
      localStorage.setItem('redirectAfterLogin', pageUrl);
      window.location.href = 'login.html?message=' + encodeURIComponent('Devi effettuare il login per accedere a questa pagina.');
    }
  } else {
    console.log('Utente non autenticato, reindirizzamento al login');
    // Salva la pagina di destinazione per il redirect dopo il login
    localStorage.setItem('redirectAfterLogin', pageUrl);
    // Reindirizza al login
    window.location.href = 'login.html?message=' + encodeURIComponent('Devi effettuare il login per accedere a questa pagina.');
  }
}

// Logout locale - chiama la funzione centralizzata
function handleLogout() {
  console.log('handleLogout chiamato');
  
  // Usa la funzione centralizzata di config.js
  if (typeof window.logout === 'function') {
    window.logout();
  } else {
    // Fallback se la funzione non è disponibile
    localStorage.removeItem('user');
    // Aggiorna navbar per mostrare i link di login/registrazione
    updateNavbar();
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

  // Mostra loading
  const submitBtn = $('#loginForm button[type="submit"]');
  const originalText = submitBtn.html();
  submitBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>Accesso in corso...');
  submitBtn.prop('disabled', true);

  // Usa fetch invece di jQuery per migliore gestione errori
  fetch(`${window.CONFIG.API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Email o password non corretti');
        } else if (response.status === 404) {
          throw new Error('Servizio di login non disponibile. Contatta il supporto.');
        } else {
          throw new Error(`Errore del server: ${response.status}`);
        }
      }
      return response.json();
    })
    .then(response => {
      // Salva l'utente
      localStorage.setItem('user', JSON.stringify(response));
      showAlert('Login effettuato con successo!', 'success');

      // Aggiorna la navbar per mostrare le informazioni dell'utente
      updateNavbar();

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
    .catch(error => {
      console.error('Errore login:', error);
      const errorMessage = error.message || 'Errore durante il login';
      showAlert(errorMessage, 'danger');
    })
    .finally(() => {
      // Ripristina il pulsante
      submitBtn.html(originalText);
      submitBtn.prop('disabled', false);
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

  // Mostra loading
  const submitBtn = $('#registrazioneForm button[type="submit"]');
  const originalText = submitBtn.html();
  submitBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>Registrazione in corso...');
  submitBtn.prop('disabled', true);

  // Usa fetch invece di jQuery per migliore gestione errori
  fetch(`${window.CONFIG.API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 400) {
          return response.json().then(err => {
            throw new Error(err.error || 'Dati di registrazione non validi');
          });
        } else if (response.status === 409) {
          throw new Error('Email già registrata. Usa un\'altra email o effettua il login.');
        } else if (response.status === 404) {
          throw new Error('Servizio di registrazione non disponibile. Contatta il supporto.');
        } else {
          throw new Error(`Errore del server: ${response.status}`);
        }
      }
      return response.json();
    })
    .then(response => {
      showAlert('Registrazione effettuata con successo! Ora effettuo il login automatico...', 'success');

      // Effettua login automatico dopo la registrazione
      const loginData = {
        email: data.email,
        password: data.password
      };

      return fetch(`${window.CONFIG.API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Registrazione completata ma login automatico fallito. Effettua il login manualmente.');
      }
      return response.json();
    })
    .then(response => {
      // Salva l'utente
      localStorage.setItem('user', JSON.stringify(response));
      showAlert('Login automatico effettuato! Reindirizzamento alla dashboard...', 'success');

      // Aggiorna la navbar per mostrare le informazioni dell'utente
      updateNavbar();

      // Vai alla dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    })
    .catch(error => {
      console.error('Errore registrazione:', error);
      const errorMessage = error.message || 'Errore durante la registrazione';
      showAlert(errorMessage, 'danger');
    })
    .finally(() => {
      // Ripristina il pulsante
      submitBtn.html(originalText);
      submitBtn.prop('disabled', false);
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

  // Test connessione API
  testAPIConnection();

  // Aggiorna navbar in base allo stato di autenticazione
  updateNavbar();

  // Inizializza il sistema di toggle password
  setupPasswordToggles();

  // Inizializza i modali di autenticazione
  setupAuthModals();

  // Inizializza la validazione dei form
  setupFormValidation();

  // Inizializza il sistema di notifiche
  if (window.modernUI) {
    window.modernUI.showToast('Benvenuto su Coworking Mio!', 'info');
  }
  
  // Verifica token all'avvio e aggiorna navbar se necessario
  if (typeof window.validateTokenOnStartup === 'function') {
    window.validateTokenOnStartup().then(isValid => {
      if (isValid) {
        console.log('Token valido, aggiorno navbar');
        updateNavbar();
      } else {
        console.log('Token non valido, navbar già aggiornata');
      }
    });
  }
});

// Funzione per testare la connessione API
function testAPIConnection() {
  console.log('Test connessione API a:', window.CONFIG.API_BASE);

  fetch(`${window.CONFIG.API_BASE}/ping`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      if (response.ok) {
        console.log('✅ API raggiungibile');
        return response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    })
    .then(data => {
      console.log('✅ Risposta API:', data);
    })
    .catch(error => {
      console.error('❌ Errore connessione API:', error);
      showAlert('⚠️ Impossibile raggiungere il server. Verifica la connessione o riprova più tardi.', 'warning');
    });
}

// ===== PASSWORD TOGGLE SYSTEM =====
function setupPasswordToggles() {
  console.log('Setup password toggles...');

  // Toggle per login password
  const toggleLoginPassword = document.getElementById('toggleLoginPassword');
  const loginPassword = document.getElementById('loginPassword');
  const loginPasswordIcon = document.getElementById('loginPasswordIcon');

  if (toggleLoginPassword && loginPassword && loginPasswordIcon) {
    console.log('Setup toggle login password');
    // Aggiungi attributi ARIA
    toggleLoginPassword.setAttribute('aria-label', 'Mostra password');
    toggleLoginPassword.setAttribute('type', 'button');
    toggleLoginPassword.setAttribute('tabindex', '0');

    toggleLoginPassword.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Toggle login password clicked');
      togglePasswordVisibility(loginPassword, loginPasswordIcon);
    });

    // Supporto per tastiera
    toggleLoginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(loginPassword, loginPasswordIcon);
      }
    });
  } else {
    console.log('Elementi login password non trovati:', { toggleLoginPassword, loginPassword, loginPasswordIcon });
  }

  // Toggle per registrazione password
  const toggleRegPassword = document.getElementById('toggleRegPassword');
  const regPassword = document.getElementById('regPassword');
  const regPasswordIcon = document.getElementById('regPasswordIcon');

  if (toggleRegPassword && regPassword && regPasswordIcon) {
    console.log('Setup toggle reg password');
    // Aggiungi attributi ARIA
    toggleRegPassword.setAttribute('aria-label', 'Mostra password');
    toggleRegPassword.setAttribute('type', 'button');
    toggleRegPassword.setAttribute('tabindex', '0');

    toggleRegPassword.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Toggle reg password clicked');
      togglePasswordVisibility(regPassword, regPasswordIcon);
    });

    // Supporto per tastiera
    toggleRegPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(regPassword, regPasswordIcon);
      }
    });
  } else {
    console.log('Elementi reg password non trovati:', { toggleRegPassword, regPassword, regPasswordIcon });
  }

  // Toggle per conferma password
  const toggleRegConfirmPassword = document.getElementById('toggleRegConfirmPassword');
  const regConfirmPassword = document.getElementById('regConfirmPassword');
  const regConfirmPasswordIcon = document.getElementById('regConfirmPasswordIcon');

  if (toggleRegConfirmPassword && regConfirmPassword && regConfirmPasswordIcon) {
    console.log('Setup toggle reg confirm password');
    // Aggiungi attributi ARIA
    toggleRegConfirmPassword.setAttribute('aria-label', 'Mostra password');
    toggleRegConfirmPassword.setAttribute('type', 'button');
    toggleRegConfirmPassword.setAttribute('tabindex', '0');

    toggleRegConfirmPassword.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Toggle reg confirm password clicked');
      togglePasswordVisibility(regConfirmPassword, regConfirmPasswordIcon);
    });

    // Supporto per tastiera
    toggleRegConfirmPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(regConfirmPassword, regConfirmPasswordIcon);
      }
    });
  } else {
    console.log('Elementi reg confirm password non trovati:', { toggleRegConfirmPassword, regConfirmPassword, regConfirmPasswordIcon });
  }
}

// Funzione per toggle della visibilità password
function togglePasswordVisibility(passwordInput, iconElement) {
  console.log('togglePasswordVisibility chiamata per:', passwordInput.id);

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    iconElement.className = 'fas fa-eye-slash';
    iconElement.title = 'Nascondi password';
    iconElement.setAttribute('aria-label', 'Nascondi password');
    // Aggiungi classe per styling
    passwordInput.parentElement.classList.add('password-visible');
    console.log('Password ora visibile');
  } else {
    passwordInput.type = 'password';
    iconElement.className = 'fas fa-eye';
    iconElement.title = 'Mostra password';
    iconElement.setAttribute('aria-label', 'Mostra password');
    // Rimuovi classe per styling
    passwordInput.parentElement.classList.remove('password-visible');
    console.log('Password ora nascosta');
  }

  // Focus sul campo password per migliorare l'UX
  passwordInput.focus();
}

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

    // Aggiungi validazione in tempo reale usando il sistema unificato
    field.addEventListener('input', () => validateField(field));
    field.addEventListener('blur', () => validateField(field));
  });
}

// ===== AUTH MODALS SYSTEM =====
function setupAuthModals() {
  // Inizializza i modal di autenticazione
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');

  if (loginModal) {
    // Gestione apertura modal login
    const loginButtons = document.querySelectorAll('[data-bs-target="#loginModal"]');
    loginButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Reset form login
        const loginForm = loginModal.querySelector('form');
        if (loginForm) loginForm.reset();

        // Rimuovi messaggi di errore
        const errorElements = loginModal.querySelectorAll('.invalid-feedback');
        errorElements.forEach(el => el.remove());

        // Rimuovi classi di validazione
        const inputs = loginModal.querySelectorAll('input');
        inputs.forEach(input => {
          input.classList.remove('is-valid', 'is-invalid');
          input.removeAttribute('aria-invalid');
        });
      });
    });
  }

  if (registerModal) {
    // Gestione apertura modal registrazione
    const registerButtons = document.querySelectorAll('[data-bs-target="#registerModal"]');
    registerButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Reset form registrazione
        const registerForm = registerModal.querySelector('form');
        if (registerForm) registerForm.reset();

        // Rimuovi messaggi di errore
        const errorElements = registerModal.querySelectorAll('.invalid-feedback');
        errorElements.forEach(el => el.remove());

        // Rimuovi classi di validazione
        const inputs = registerModal.querySelectorAll('input');
        inputs.forEach(input => {
          input.classList.remove('is-valid', 'is-invalid');
          input.removeAttribute('aria-invalid');
        });
      });
    });
  }

  // Gestione chiusura modal
  const modals = [loginModal, registerModal].filter(Boolean);
  modals.forEach(modal => {
    modal.addEventListener('hidden.bs.modal', () => {
      // Reset form quando si chiude il modal
      const form = modal.querySelector('form');
      if (form) form.reset();

      // Rimuovi messaggi di errore
      const errorElements = modal.querySelectorAll('.invalid-feedback');
      errorElements.forEach(el => el.remove());

      // Rimuovi classi di validazione
      const inputs = modal.querySelectorAll('input');
      inputs.forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
        input.removeAttribute('aria-invalid');
      });
    });
  });
}

// ===== FORM VALIDATION SYSTEM =====
function setupFormValidation() {
  // Inizializza la validazione dei form
  const forms = document.querySelectorAll('form');

  forms.forEach(form => {
    // Gestione submit form
    form.addEventListener('submit', (e) => {
      if (!validateForm(form)) {
        e.preventDefault();
        return false;
      }
    });

    // Validazione in tempo reale per i campi input
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => validateField(input));
    });
  });
}

// Funzione per validare un singolo campo
function validateField(field) {
  const inputGroup = field.closest('.input-group') || field.parentElement;

  // Rimuovi stati precedenti
  inputGroup.classList.remove('is-valid', 'is-invalid');
  field.classList.remove('is-valid', 'is-invalid');

  // Validazione base per campi obbligatori
  if (field.hasAttribute('required') && !field.value.trim()) {
    showFieldError(inputGroup, field, 'Questo campo è obbligatorio');
    return false;
  }

  // Validazione email
  if (field.type === 'email' && field.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value)) {
      showFieldError(inputGroup, field, 'Inserisci un indirizzo email valido');
      return false;
    }
  }

  // Validazione per conferma password
  if (field.id === 'regConfirmPassword') {
    const passwordField = document.getElementById('regPassword');
    if (passwordField && field.value !== passwordField.value) {
      showFieldError(inputGroup, field, 'Le password non coincidono');
      return false;
    }
  }

  // Validazione lunghezza minima password
  if (field.type === 'password' && field.value.trim()) {
    if (field.value.length < 6) {
      showFieldError(inputGroup, field, 'La password deve essere di almeno 6 caratteri');
      return false;
    }
  }

  // Validazione telefono
  if (field.name === 'telefono' && field.value.trim()) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (!phoneRegex.test(field.value)) {
      showFieldError(inputGroup, field, 'Inserisci un numero di telefono valido');
      return false;
    }
  }

  // Se tutto è valido
  if (field.value.trim()) {
    showFieldSuccess(inputGroup, field);
    return true;
  }

  return true;
}

// Funzione per validare un intero form
function validateForm(form) {
  let isValid = true;
  const requiredFields = form.querySelectorAll('[required]');

  requiredFields.forEach(field => {
    if (!validateField(field)) {
      isValid = false;
    }
  });

  return isValid;
}

// Funzione per mostrare errori nei campi
function showFieldError(inputGroup, field, message) {
  inputGroup.classList.add('is-invalid');
  field.classList.add('is-invalid');
  field.setAttribute('aria-invalid', 'true');

  // Crea o aggiorna il messaggio di errore
  let errorElement = inputGroup.querySelector('.invalid-feedback');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'invalid-feedback';
    errorElement.id = `${field.id || field.name}-error`;
    inputGroup.appendChild(errorElement);
  }

  errorElement.textContent = message;
  field.setAttribute('aria-describedby', errorElement.id);
}

// Funzione per mostrare successo nei campi
function showFieldSuccess(inputGroup, field) {
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