// Configurazione API - usa quella globale da config.js

// Variabili globali
let currentStep = 1;
let selectedSede = null;
let selectedSpazio = null;
let selectedDataInizio = null;
let selectedDataFine = null;
let disponibilitaVerificata = false;
let lastCreatedPrenotazioneId = null;

// Inizializzazione
$(document).ready(function () {
  console.log('prenota.js - Inizializzazione pagina');
  console.log('prenota.js - jQuery disponibile:', typeof $ !== 'undefined');
  console.log('prenota.js - jQuery versione:', $.fn.jquery);
  console.log('prenota.js - window.CONFIG:', window.CONFIG);
  console.log('prenota.js - API_BASE:', window.CONFIG?.API_BASE);

  // Inizializza la pagina normalmente - l'autenticazione sarà richiesta solo quando necessario
  currentStep = 1;
  console.log('prenota.js - Prima di chiamare loadSedi()');
  loadSedi().then(() => {
    console.log('prenota.js - loadSedi completato con successo');
    setupEventHandlers();
    updateNavbar();
  }).catch(error => {
    console.error('prenota.js - Errore in loadSedi:', error);
  });

  // Controlla se ci sono parametri URL per ripristinare lo stato
  const urlParams = new URLSearchParams(window.location.search);
  const sedeId = urlParams.get('sede');
  const spazioId = urlParams.get('spazio');
  const dataInizio = urlParams.get('dal');
  const dataFine = urlParams.get('al');

  if (sedeId && spazioId && dataInizio && dataFine) {
    // Ripristina lo stato della prenotazione
    console.log('prenota.js - Ripristino stato da URL:', { sedeId, spazioId, dataInizio, dataFine });

    // Imposta i valori selezionati
    selectedSede = sedeId;
    selectedSpazio = spazioId;
    selectedDataInizio = dataInizio;
    selectedDataFine = dataFine;

    // Imposta i valori nei campi
    $('#dataInizio').val(dataInizio);
    $('#dataFine').val(dataFine);

    // Carica i dati e vai allo step 3
    loadSedi().then(() => {
      $('#selectSede').val(sedeId);
      onSedeChange();
    });
  } else {
    // Nessun parametro, inizia normalmente
    showStep(1);
  }
});

// Aggiorna navbar se utente è loggato
function updateNavbar() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    // Sostituisci il link Login con Dashboard
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
  // Usa la funzione centralizzata di config.js
  if (typeof window.logout === 'function') {
    window.logout();
  } else {
    // Fallback se la funzione non è disponibile
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }
}

// Carica sedi
function loadSedi() {
  console.log('loadSedi - Inizio funzione');
  console.log('loadSedi - window.CONFIG:', window.CONFIG);
  console.log('loadSedi - API_BASE:', window.CONFIG?.API_BASE);
  
  return new Promise((resolve, reject) => {
    const url = `${window.CONFIG.API_BASE}/sedi`;
    console.log('loadSedi - Chiamata API:', url);
    
    $.ajax({
      url: url,
      method: 'GET',
      timeout: 10000, // 10 secondi di timeout
      // Rimuovo headers per endpoint pubblico che non richiede autenticazione
    })
      .done(function (sedi) {
        console.log('loadSedi - Risposta ricevuta:', sedi);
        console.log('loadSedi - Numero sedi ricevute:', sedi.length);
        
        const select = $('#selectSede');
        console.log('loadSedi - Elemento select trovato:', select.length > 0);
        console.log('loadSedi - Select prima della pulizia:', select.html());
        
        select.find('option:not(:first)').remove();
        console.log('loadSedi - Select dopo la pulizia:', select.html());
        
        sedi.forEach((sede, index) => {
          const option = `<option value="${sede.id_sede}">${sede.nome} - ${sede.citta}</option>`;
          console.log(`loadSedi - Aggiungo opzione ${index}:`, option);
          select.append(option);
        });
        
        console.log('loadSedi - Select finale:', select.html());
        console.log('loadSedi - Numero opzioni finali:', select.find('option').length);

        // Se c'è una sede preselezionata, impostala
        const urlParams = new URLSearchParams(window.location.search);
        const sedeId = urlParams.get('sede');
        if (sedeId) {
          select.val(sedeId);
          onSedeChange();
        }

        console.log('loadSedi - Chiamando resolve con sedi:', sedi);
        resolve(sedi);
      })
      .fail(function (xhr) {
        console.error('loadSedi - Errore API:', xhr.status, xhr.responseText);
        console.error('loadSedi - URL chiamata:', url);
        console.error('loadSedi - Headers risposta:', xhr.getAllResponseHeaders());
        console.error('loadSedi - Stato readyState:', xhr.readyState);
        console.error('loadSedi - Tipo errore:', xhr.statusText);
        
        if (xhr.status === 401) {
          handleAuthError();
        } else {
          showAlert('Errore nel caricamento delle sedi', 'danger');
        }
        reject(xhr);
      })
      .always(function() {
        console.log('loadSedi - Chiamata completata (success o fail)');
      });
  });
}

// Carica spazi di una sede
function loadSpazi(idSede) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `${window.CONFIG.API_BASE}/spazi?id_sede=${idSede}`,
      method: 'GET',
      headers: getAuthHeaders() // Ripristino per mantenere Content-Type
    })
      .done(function (spazi) {
        const select = $('#selectSpazio');
        select.find('option:not(:first)').remove();

        spazi.forEach(spazio => {
          select.append(`<option value="${spazio.id_spazio}">${spazio.nome} (${spazio.tipologia})</option>`);
        });

        // Se c'è uno spazio preselezionato, impostalo
        const urlParams = new URLSearchParams(window.location.search);
        const spazioId = urlParams.get('spazio');
        if (spazioId) {
          select.val(spazioId);
          onSpazioChange();
        }

        resolve(spazi);
      })
      .fail(function (xhr) {
        console.log('loadSpazi - Errore:', xhr.status, xhr.responseText);
        if (xhr.status === 401) {
          handleAuthError();
        } else {
          showAlert('Errore nel caricamento degli spazi', 'danger');
        }
        reject(xhr);
      });
  });
}

// Carica servizi di uno spazio
function loadServiziSpazio(idSpazio) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `${window.CONFIG.API_BASE}/spazi/${idSpazio}/servizi`,
      method: 'GET',
      headers: getAuthHeaders() // Ripristino per mantenere Content-Type
    })
      .done(function (servizi) {
        const container = $('#spazioInfo');
        if (servizi.length === 0) {
          container.html('<p class="text-muted">Nessun servizio disponibile</p>');
        } else {
          let html = '<h6>Servizi inclusi:</h6><ul class="list-unstyled">';
          servizi.forEach(servizio => {
            html += `<li><i class="bi bi-check-circle text-success"></i> ${servizio.nome}</li>`;
          });
          html += '</ul>';
          container.html(html);
        }
        resolve(servizi);
      })
      .fail(function (xhr) {
        console.log('loadServiziSpazio - Errore:', xhr.status, xhr.responseText);
        if (xhr.status === 401) {
          handleAuthError();
        } else {
          $('#spazioInfo').html('<p class="text-muted">Errore nel caricamento dei servizi</p>');
        }
        reject(xhr);
      });
  });
}

// Valida le date
function validateDates() {
  const dataInizio = $('#dataInizio').val();
  const dataFine = $('#dataFine').val();

  if (!dataInizio || !dataFine) {
    return { valid: false, message: 'Seleziona data inizio e fine' };
  }

  const now = new Date();
  const inizio = new Date(dataInizio);
  const fine = new Date(dataFine);

  if (inizio < now) {
    return { valid: false, message: 'La data di inizio non può essere nel passato' };
  }

  if (fine <= inizio) {
    return { valid: false, message: 'La data di fine deve essere successiva alla data di inizio' };
  }

  const diffHours = (fine - inizio) / (1000 * 60 * 60);
  if (diffHours < 1) {
    return { valid: false, message: 'La prenotazione deve durare almeno 1 ora' };
  }

  if (diffHours > 24 * 7) {
    return { valid: false, message: 'La prenotazione non può durare più di 7 giorni' };
  }

  return { valid: true };
}

// Verifica disponibilità
function checkDisponibilita() {
  const idSpazio = $('#selectSpazio').val();
  const dataInizio = $('#dataInizio').val();
  const dataFine = $('#dataFine').val();

  // Valida le date
  const validation = validateDates();
  if (!validation.valid) {
    showAlert(validation.message, 'warning');
    return;
  }

  if (!idSpazio) {
    showAlert('Seleziona uno spazio', 'warning');
    return;
  }

  const statusElement = $('#disponibilitaStatus');
  statusElement.html('<span class="text-info">Verificando...</span>');

  $.ajax({
    url: `${window.CONFIG.API_BASE}/spazi/${idSpazio}/disponibilita`,
    method: 'GET',
    headers: getAuthHeaders(),
    data: {
      data_inizio: dataInizio,
      data_fine: dataFine
    }
  })
    .done(function (response) {
      if (response.disponibile) {
        statusElement.html('<span class="text-success">✓ Spazio disponibile</span>');
        selectedDataInizio = dataInizio;
        selectedDataFine = dataFine;
        disponibilitaVerificata = true;
        updateNavigationButtons();
      } else {
        statusElement.html('<span class="text-danger">✗ Spazio non disponibile</span>');
        disponibilitaVerificata = false;
        updateNavigationButtons();
      }
    })
    .fail(function (xhr) {
      console.log('checkDisponibilita - Errore:', xhr.status, xhr.responseText);
      statusElement.html('<span class="text-danger">Errore nella verifica</span>');
      disponibilitaVerificata = false;
      updateNavigationButtons();
    });
}

// Aggiorna pulsanti di navigazione
function updateNavigationButtons() {
  const btnNext = $('#btnNext');
  const btnPrev = $('#btnPrev');
  const btnConferma = $('#btnConferma');

  // Gestisci pulsante Precedente
  if (currentStep > 1) {
    btnPrev.prop('disabled', false);
  } else {
    btnPrev.prop('disabled', true);
  }

  // Gestisci pulsante Successivo/Conferma
  if (currentStep === 4) {
    // Allo step finale, mostra solo il pulsante Conferma
    btnNext.addClass('d-none');
    btnConferma.removeClass('d-none');
  } else {
    // Negli altri step, mostra il pulsante Successivo
    btnNext.removeClass('d-none');
    btnConferma.addClass('d-none');

    // Allo step 3, "Successivo" è disponibile solo se la disponibilità è verificata
    if (currentStep === 3) {
      if (disponibilitaVerificata) {
        btnNext.prop('disabled', false);
      } else {
        btnNext.prop('disabled', true);
      }
    } else {
      btnNext.prop('disabled', false);
    }
  }
}

// Crea prenotazione
function createPrenotazione() {
  console.log('createPrenotazione - Inizio funzione');

  // Verifica che tutti i dati necessari siano selezionati
  if (!selectedSede || !selectedSpazio || !selectedDataInizio || !selectedDataFine) {
    showAlert('Completa tutti i passaggi della prenotazione prima di procedere', 'warning');
    return;
  }

  // L'utente è già autenticato (controllo fatto in showStep)
  const userStr = localStorage.getItem('user');
  const user = JSON.parse(userStr);

  console.log('createPrenotazione - User:', user);
  console.log('createPrenotazione - Dati prenotazione:', { selectedSede, selectedSpazio, selectedDataInizio, selectedDataFine });

  const data = {
    id_utente: user.id_utente,
    id_spazio: selectedSpazio,
    data_inizio: selectedDataInizio,
    data_fine: selectedDataFine
  };

  const headers = getAuthHeaders();
  console.log('createPrenotazione - Headers:', headers);
  console.log('createPrenotazione - URL:', `${window.CONFIG.API_BASE}/prenotazioni`);
  console.log('createPrenotazione - Data:', data);

  $.ajax({
    url: `${window.CONFIG.API_BASE}/prenotazioni`,
    method: 'POST',
    headers: headers,
    data: JSON.stringify(data)
  })
    .done(async function (response) {
      lastCreatedPrenotazioneId = response.id_prenotazione;
      showAlert('Prenotazione creata! Procedi al pagamento...', 'success');

      // MOCK: crea intent e mostra modal
      try {
        const intent = await $.ajax({
          url: `${window.CONFIG.API_BASE}/pagamenti/intent`,
          method: 'POST',
          headers: getAuthHeaders(),
          data: JSON.stringify({ id_prenotazione: lastCreatedPrenotazioneId })
        });
        showPaymentModal(intent.id_pagamento, intent.importo);
        showStep(4);
      } catch (e) {
        if (e.status === 401) {
          handleAuthError();
        } else {
          showAlert('Errore nella creazione del pagamento', 'danger');
        }
      }
    })
    .fail(function (xhr) {
      console.log('createPrenotazione - Errore:', xhr.status, xhr.responseText);

      if (xhr.status === 401) {
        console.log('createPrenotazione - Errore 401, sessione scaduta');
        handleAuthError();
      } else {
        const error = xhr.responseJSON?.error || 'Errore durante la creazione della prenotazione';
        showAlert(error, 'danger');
      }
    });
}

// Conferma prenotazione e procedi al pagamento
function confermaPrenotazione() {
  createPrenotazione();
}

function showPaymentModal(idPagamento, importo) {
  const modalHtml = `
  <div class="modal fade" id="paymentModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Conferma Prenotazione</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p>Importo da pagare: <strong>€ ${importo}</strong></p>
          <p>Clicca "Paga ora" per procedere al pagamento e confermare la tua prenotazione.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
          <button type="button" class="btn btn-success" id="btnPagaOra">Paga ora</button>
        </div>
      </div>
    </div>
  </div>`;

  $('body').append(modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
  modal.show();

  $('#btnPagaOra').click(async function () {
    try {
      // Chiudi il modal
      modal.hide();

      // Salva i dati della prenotazione per la pagina di pagamento
      const prenotazioneData = {
        sede: selectedSede,
        spazio: selectedSpazio,
        dataInizio: selectedDataInizio,
        dataFine: selectedDataFine
      };
      localStorage.setItem('pendingPrenotazione', JSON.stringify(prenotazioneData));

      // Vai direttamente alla pagina di pagamento
      window.location.href = 'pagamento.html';

    } catch (e) {
      showAlert('Errore durante la preparazione del pagamento', 'danger');
    }
  });

  $('#paymentModal').on('hidden.bs.modal', function () {
    $('#paymentModal').remove();
  });
}

// Mostra step specifico
function showStep(step) {
  // Controllo autenticazione per lo step 4
  if (step === 4) {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      // Salva i dati della prenotazione per ripristinarli dopo il login
      const prenotazioneData = {
        sede: selectedSede,
        spazio: selectedSpazio,
        dataInizio: selectedDataInizio,
        dataFine: selectedDataFine,
        returnUrl: window.location.href
      };
      localStorage.setItem('pendingPrenotazione', JSON.stringify(prenotazioneData));

      showAlert('Devi effettuare il login per completare la prenotazione. Verrai reindirizzato alla registrazione.', 'warning');
      window.location.href = 'login.html#registrazione';
      return;
    }
  }

  // Nascondi tutti gli step
  for (let i = 1; i <= 4; i++) {
    $(`#step${i}`).hide();
  }

  // Mostra lo step corrente
  $(`#step${step}`).show();

  // Se è lo step 4, aggiorna il riepilogo
  if (step === 4) {
    updateRiepilogo();
  }

  // I pulsanti di navigazione sono gestiti da updateNavigationButtons()

  currentStep = step;
  updateNavigationButtons();

  // Aggiorna riepilogo se siamo allo step 4
  if (step === 4) {
    updateRiepilogo();
  }

  // Reset disponibilità quando cambiamo step
  if (step !== 3) {
    disponibilitaVerificata = false;
  }
}

// Aggiorna riepilogo prenotazione
function updateRiepilogo() {
  const container = $('#riepilogoPrenotazione');

  // Verifica che tutti i dati necessari siano presenti
  if (!selectedSede || !selectedSpazio || !selectedDataInizio || !selectedDataFine) {
    container.html('<div class="alert alert-warning">Dati prenotazione incompleti. Completa tutti i passaggi precedenti.</div>');
    return;
  }

  // Verifica che i select abbiano le opzioni caricate
  const sedeSelect = $('#selectSede');
  const spazioSelect = $('#selectSpazio');

  if (sedeSelect.find('option').length <= 1 || spazioSelect.find('option').length <= 1) {
    container.html('<div class="alert alert-warning">Caricamento dati in corso...</div>');
    return;
  }

  // Recupera i dati delle sedi e spazi selezionati
  const sedeText = sedeSelect.find('option:selected').text() || 'Sede selezionata';
  const spazioText = spazioSelect.find('option:selected').text() || 'Spazio selezionato';

  const dataInizio = new Date(selectedDataInizio).toLocaleString('it-IT');
  const dataFine = new Date(selectedDataFine).toLocaleString('it-IT');

  const html = `
    <div class="row">
      <div class="col-md-6">
        <p><strong>Sede:</strong> ${sedeText}</p>
        <p><strong>Spazio:</strong> ${spazioText}</p>
      </div>
      <div class="col-md-6">
        <p><strong>Data inizio:</strong> ${dataInizio}</p>
        <p><strong>Data fine:</strong> ${dataFine}</p>
      </div>
    </div>
  `;

  container.html(html);
}

// Event handlers
function setupEventHandlers() {
  // Cambio sede
  $('#selectSede').change(onSedeChange);

  // Cambio spazio
  $('#selectSpazio').change(onSpazioChange);

  // Verifica disponibilità
  $('#btnCheckDisponibilita').click(checkDisponibilita);

  // Validazione date in tempo reale
  $('#dataInizio, #dataFine').change(function () {
    disponibilitaVerificata = false;
    $('#disponibilitaStatus').html('');
    updateNavigationButtons();
  });

  // I pulsanti sono gestiti tramite onclick nell'HTML (nextStep e previousStep)

  // Submit form
  $('#prenotazioneForm').submit(function (e) {
    e.preventDefault();
    createPrenotazione();
  });
}

// Callback per cambio sede
function onSedeChange() {
  const sedeId = $('#selectSede').val();
  if (sedeId) {
    selectedSede = sedeId;
    loadSpazi(sedeId).then(() => {
      // Se c'è uno spazio preselezionato, impostalo
      const urlParams = new URLSearchParams(window.location.search);
      const spazioId = urlParams.get('spazio');
      if (spazioId) {
        $('#selectSpazio').val(spazioId);
        onSpazioChange();
      } else {
        showStep(2);
      }
    });
  }
}

// Callback per cambio spazio
function onSpazioChange() {
  const spazioId = $('#selectSpazio').val();
  if (spazioId) {
    selectedSpazio = spazioId;
    loadServiziSpazio(spazioId).then(() => {
      // Se ci sono date preselezionate, vai allo step 3
      const urlParams = new URLSearchParams(window.location.search);
      const dataInizio = urlParams.get('dal');
      const dataFine = urlParams.get('al');

      if (dataInizio && dataFine) {
        // Imposta le date e vai allo step 3
        $('#dataInizio').val(dataInizio);
        $('#dataFine').val(dataFine);
        showStep(3);
      } else {
        showStep(3);
      }
    });
  }
}

// Utility function per alert
function showAlert(message, type = 'info') {
  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  $('body').prepend(alertHtml);
}

// Funzioni di navigazione tra step
function nextStep() {
  if (canProceedToNextStep()) {
    showStep(currentStep + 1);
  }
}

function previousStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

// Verifica se si può procedere al prossimo step
function canProceedToNextStep() {
  if (currentStep === 1 && !$('#selectSede').val()) {
    showAlert('Seleziona una sede prima di procedere', 'warning');
    return false;
  }

  if (currentStep === 2 && !$('#selectSpazio').val()) {
    showAlert('Seleziona uno spazio prima di procedere', 'warning');
    return false;
  }

  if (currentStep === 3 && !disponibilitaVerificata) {
    showAlert('Verifica la disponibilità prima di procedere', 'warning');
    return false;
  }

  return true;
}