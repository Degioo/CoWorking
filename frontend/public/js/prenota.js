// Configurazione API
const API_BASE = window.CONFIG ? window.CONFIG.API_BASE : 'http://localhost:3002/api';

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
  // Verifica validità token all'avvio
  validateTokenOnStartup().then(() => {
    // Aggiorna navbar se loggato (dopo la validazione)
    updateNavbar();
  });

  setupEventHandlers();

  const urlParams = new URLSearchParams(window.location.search);
  const sedeId = urlParams.get('sede');
  const spazioId = urlParams.get('spazio');
  const dal = urlParams.get('dal');
  const al = urlParams.get('al');

  if (dal) $('#dataInizio').val(dal);
  if (al) $('#dataFine').val(al);

  // Se l'utente è loggato e ha completato i primi step, mostra direttamente lo step 4
  const userStr = localStorage.getItem('user');
  if (userStr && sedeId && spazioId && dal && al) {
    // L'utente è tornato dopo il login, ripristina i dati e vai allo step finale
    selectedSede = sedeId;
    selectedSpazio = spazioId;
    selectedDataInizio = dal;
    selectedDataFine = al;
    disponibilitaVerificata = true;

    // Carica le sedi e gli spazi per impostare i valori dei select
    loadSedi();
    setTimeout(() => {
      $('#selectSede').val(sedeId);
      loadSpazi(sedeId);
      setTimeout(() => {
        $('#selectSpazio').val(spazioId);

        // Nascondi tutti gli step e vai direttamente al pagamento
        for (let i = 1; i <= 4; i++) {
          $(`#step${i}`).hide();
        }

        // Mostra solo lo step 4
        $('#step4').show();

        // Nascondi i pulsanti di navigazione
        $('#btnAvanti, #btnIndietro').hide();

        updateRiepilogo();
        showAlert('Bentornato! I tuoi dati di prenotazione sono stati ripristinati. Procedi con il pagamento.', 'info');
      }, 500);
    }, 500);
  } else if (userStr) {
    // L'utente è loggato ma non ha parametri URL, controlla se ha una prenotazione in attesa
    const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');
    if (pendingPrenotazione) {
      const prenotazioneData = JSON.parse(pendingPrenotazione);
      // Rimuovi i dati temporanei
      localStorage.removeItem('pendingPrenotazione');

      // Ripristina i dati e vai allo step finale
      selectedSede = prenotazioneData.sede;
      selectedSpazio = prenotazioneData.spazio;
      selectedDataInizio = prenotazioneData.dataInizio;
      selectedDataFine = prenotazioneData.dataFine;
      disponibilitaVerificata = true;

      // Carica le sedi e gli spazi per impostare i valori dei select
      loadSedi();
      setTimeout(() => {
        $('#selectSede').val(selectedSede);
        loadSpazi(selectedSede);
        setTimeout(() => {
          $('#selectSpazio').val(selectedSpazio);

          // Nascondi tutti gli step e vai direttamente al pagamento
          for (let i = 1; i <= 4; i++) {
            $(`#step${i}`).hide();
          }

          // Mostra solo lo step 4
          $('#step4').show();

          // Nascondi i pulsanti di navigazione
          $('#btnAvanti, #btnIndietro').hide();

          updateRiepilogo();
          showAlert('I tuoi dati di prenotazione sono stati ripristinati. Procedi con il pagamento.', 'info');
        }, 500);
      }, 500);
    } else {
      // L'utente è loggato ma non ha prenotazioni in attesa, carica normalmente
      loadSedi();

      if (sedeId) {
        selectedSede = sedeId;
        setTimeout(() => {
          $('#selectSede').val(sedeId);
          onSedeChange();
          if (spazioId) {
            setTimeout(() => {
              $('#selectSpazio').val(spazioId);
              onSpazioChange();
            }, 500);
          }
        }, 500);
      }
    }
  } else {
    // L'utente non è loggato, carica normalmente
    loadSedi();

    if (sedeId) {
      selectedSede = sedeId;
      setTimeout(() => {
        $('#selectSede').val(sedeId);
        onSedeChange();
        if (spazioId) {
          setTimeout(() => {
            $('#selectSpazio').val(spazioId);
            onSpazioChange();
          }, 500);
        }
      }, 500);
    }
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
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Carica sedi
function loadSedi() {
  $.get(`${API_BASE}/sedi`)
    .done(function (sedi) {
      const select = $('#selectSede');
      select.find('option:not(:first)').remove();

      sedi.forEach(sede => {
        select.append(`<option value="${sede.id_sede}">${sede.nome} - ${sede.citta}</option>`);
      });

      // Se c'è una sede preselezionata, impostala
      const urlParams = new URLSearchParams(window.location.search);
      const sedeId = urlParams.get('sede');
      if (sedeId) {
        select.val(sedeId);
        onSedeChange();
      }
    })
    .fail(function () {
      showAlert('Errore nel caricamento delle sedi', 'danger');
    });
}

// Carica spazi di una sede
function loadSpazi(idSede) {
  $.get(`${API_BASE}/spazi?id_sede=${idSede}`)
    .done(function (spazi) {
      const select = $('#selectSpazio');
      select.find('option:not(:first)').remove();

      spazi.forEach(spazio => {
        select.append(`<option value="${spazio.id_spazio}">${spazio.nome} (${spazio.tipologia})</option>`);
      });
    })
    .fail(function () {
      showAlert('Errore nel caricamento degli spazi', 'danger');
    });
}

// Carica servizi di uno spazio
function loadServiziSpazio(idSpazio) {
  $.get(`${API_BASE}/spazi/${idSpazio}/servizi`)
    .done(function (servizi) {
      const container = $('#spazioInfo');
      if (servizi.length === 0) {
        container.html('<p class="text-muted">Nessun servizio disponibile</p>');
        return;
      }

      let html = '<h6>Servizi inclusi:</h6><ul class="list-unstyled">';
      servizi.forEach(servizio => {
        html += `<li><i class="bi bi-check-circle text-success"></i> ${servizio.nome}</li>`;
      });
      html += '</ul>';
      container.html(html);
    })
    .fail(function () {
      $('#spazioInfo').html('<p class="text-muted">Errore nel caricamento dei servizi</p>');
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

  $.get(`${API_BASE}/spazi/${idSpazio}/disponibilita`, {
    data_inizio: dataInizio,
    data_fine: dataFine
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
    .fail(function () {
      statusElement.html('<span class="text-danger">Errore nella verifica</span>');
      disponibilitaVerificata = false;
      updateNavigationButtons();
    });
}

// Aggiorna pulsanti di navigazione
function updateNavigationButtons() {
  const btnAvanti = $('#btnAvanti');
  const btnIndietro = $('#btnIndietro');

  if (currentStep === 3) {
    // Allo step 3, "Avanti" è disponibile solo se la disponibilità è verificata
    if (disponibilitaVerificata) {
      btnAvanti.prop('disabled', false).text('Avanti →');
    } else {
      btnAvanti.prop('disabled', true).text('Verifica disponibilità prima');
    }
  } else {
    btnAvanti.prop('disabled', false).text('Avanti →');
  }
}

// Crea prenotazione
function createPrenotazione() {
  // Verifica che tutti i dati necessari siano selezionati
  if (!selectedSede || !selectedSpazio || !selectedDataInizio || !selectedDataFine) {
    showAlert('Completa tutti i passaggi della prenotazione prima di procedere', 'warning');
    return;
  }

  // L'utente è già autenticato (controllo fatto in showStep)
  const userStr = localStorage.getItem('user');
  const user = JSON.parse(userStr);
  const data = {
    id_utente: user.id_utente,
    id_spazio: selectedSpazio,
    data_inizio: selectedDataInizio,
    data_fine: selectedDataFine
  };

  $.ajax({
    url: `${API_BASE}/prenotazioni`,
    method: 'POST',
    headers: getAuthHeaders(),
    data: JSON.stringify(data)
  })
    .done(async function (response) {
      lastCreatedPrenotazioneId = response.id_prenotazione;
      showAlert('Prenotazione creata! Procedi al pagamento...', 'success');

      // MOCK: crea intent e mostra modal
      try {
        const intent = await $.ajax({
          url: `${API_BASE}/pagamenti/intent`,
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
      if (xhr.status === 401) {
        handleAuthError();
      } else {
        const error = xhr.responseJSON?.error || 'Errore durante la creazione della prenotazione';
        showAlert(error, 'danger');
      }
    });
}

function showPaymentModal(idPagamento, importo) {
  const modalHtml = `
  <div class="modal fade" id="paymentModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Pagamento</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p>Importo da pagare: <strong>€ ${importo}</strong></p>
          <p>Questa è una simulazione di pagamento. Clicca "Paga ora" per confermare.</p>
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
      await $.ajax({
        url: `${API_BASE}/pagamenti/${idPagamento}/confirm`,
        method: 'POST',
        headers: getAuthHeaders()
      });
      modal.hide();
      showAlert('Pagamento effettuato con successo!', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    } catch (e) {
      if (e.status === 401) {
        handleAuthError();
      } else {
        showAlert('Pagamento fallito', 'danger');
      }
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

  // Gestisci pulsanti di navigazione
  if (step > 1) {
    $('#btnIndietro').show();
  } else {
    $('#btnIndietro').hide();
  }

  if (step < 4) {
    $('#btnAvanti').show();
  } else {
    $('#btnAvanti').hide();
  }

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

  // Recupera i dati delle sedi e spazi selezionati
  const sedeText = $('#selectSede option:selected').text();
  const spazioText = $('#selectSpazio option:selected').text();

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

  // Navigazione
  $('#btnAvanti').click(function () {
    if (currentStep === 1 && !$('#selectSede').val()) {
      showAlert('Seleziona una sede', 'warning');
      return;
    }
    if (currentStep === 2 && !$('#selectSpazio').val()) {
      showAlert('Seleziona uno spazio', 'warning');
      return;
    }
    if (currentStep === 3 && !disponibilitaVerificata) {
      showAlert('Verifica prima la disponibilità', 'warning');
      return;
    }

    showStep(currentStep + 1);
  });

  $('#btnIndietro').click(function () {
    showStep(currentStep - 1);
  });

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
    loadSpazi(sedeId);
    showStep(2);
  }
}

// Callback per cambio spazio
function onSpazioChange() {
  const spazioId = $('#selectSpazio').val();
  if (spazioId) {
    selectedSpazio = spazioId;
    loadServiziSpazio(spazioId);
    showStep(3);
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