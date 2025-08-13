const API_BASE = window.CONFIG ? window.CONFIG.API_BASE : 'http://localhost:3002/api';

$(document).ready(function () {
  // Verifica validità token all'avvio
  validateTokenOnStartup().then(() => {
    // Aggiorna navbar se loggato (dopo la validazione)
    updateNavbar();
  });
  
  loadCitta();
  loadServizi();
  $('#formFiltri').on('submit', function (e) {
    e.preventDefault();
    cercaSpazi();
  });
  // Ricerca iniziale senza filtri
  cercaSpazi();
});

function updateNavbar() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    $('#navbarUserArea').html(`
      <li class="nav-item"><span class="nav-link text-light">${user.nome} ${user.cognome}</span></li>
      <li class="nav-item"><a class="nav-link" href="dashboard.html">Dashboard</a></li>
      <li class="nav-item"><a class="nav-link" href="#" onclick="logout()">Logout</a></li>
    `);
  }
}
function logout() { 
  localStorage.removeItem('user'); 
  localStorage.removeItem('authToken');
  location.reload(); 
}

function loadCitta() {
  $.get(`${API_BASE}/sedi`).done(sedi => {
    const unique = [...new Set(sedi.map(s => s.citta))];
    const sel = $('#filtroCitta');
    unique.forEach(c => sel.append(`<option value="${c}">${c}</option>`));
  });
}

function loadServizi() {
  $.get(`${API_BASE}/servizi`).done(servizi => {
    const box = $('#filtroServizi');
    servizi.forEach(s => {
      box.append(`
        <div class="form-check">
          <input class="form-check-input servizio-check" type="checkbox" value="${s.id_servizio}" id="srv-${s.id_servizio}">
          <label class="form-check-label" for="srv-${s.id_servizio}">${s.nome}</label>
        </div>
      `);
    });
  });
}

async function cercaSpazi() {
  const citta = $('#filtroCitta').val();
  const tipologia = $('#filtroTipologia').val();
  const dal = $('#filtroDal').val();
  const al = $('#filtroAl').val();
  const soloDisponibili = $('#soloDisponibili').is(':checked');
  const serviziSelezionati = $('.servizio-check:checked').map((i, el) => $(el).val()).get();

  // 1) prendo le sedi (eventualmente filtrate per città)
  const sedi = await $.get(citta ? `${API_BASE}/sedi?citta=${encodeURIComponent(citta)}` : `${API_BASE}/sedi`);

  // 2) per ogni sede, prendo gli spazi (eventuale filtro tipologia)
  const risultati = [];
  for (const sede of sedi) {
    const spazi = await $.get(tipologia ? `${API_BASE}/spazi?id_sede=${sede.id_sede}&tipologia=${encodeURIComponent(tipologia)}` : `${API_BASE}/spazi?id_sede=${sede.id_sede}`);

    for (const spazio of spazi) {
      // 3) filtro per servizi (se selezionati)
      if (serviziSelezionati.length > 0) {
        const srv = await $.get(`${API_BASE}/spazi/${spazio.id_spazio}/servizi`);
        const ids = srv.map(s => String(s.id_servizio));
        const includeAll = serviziSelezionati.every(id => ids.includes(id));
        if (!includeAll) continue;
      }

      // 4) controllo disponibilità (se richiesto e se date inserite)
      let disponibile = true;
      if (soloDisponibili && dal && al) {
        const res = await $.get(`${API_BASE}/spazi/${spazio.id_spazio}/disponibilita`, { data_inizio: dal, data_fine: al });
        disponibile = !!res.disponibile;
      }
      if (soloDisponibili && (!dal || !al)) {
        // se spunta "solo disponibili" ma non ha date, ignoriamo il filtro disponibili
        disponibile = true;
      }

      risultati.push({ sede, spazio, disponibile });
    }
  }

  renderRisultati(risultati, dal, al);
}

function renderRisultati(items, dal, al) {
  const grid = $('#risultati');
  grid.empty();
  if (items.length === 0) {
    grid.html('<div class="col-12"><div class="alert alert-info">Nessun risultato trovato</div></div>');
    return;
  }

  items.forEach(({ sede, spazio, disponibile }) => {
    const badge = disponibile ? '<span class="badge bg-success">Disponibile</span>' : '<span class="badge bg-secondary">Verifica</span>';
    const linkPrenota = `prenota.html?sede=${sede.id_sede}&spazio=${spazio.id_spazio}${dal && al ? `&dal=${encodeURIComponent(dal)}&al=${encodeURIComponent(al)}` : ''}`;

    grid.append(`
      <div class="col-md-6 col-lg-4">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${spazio.nome}</h5>
            <p class="card-text mb-1"><strong>Sede:</strong> ${sede.nome} - ${sede.citta}</p>
            <p class="card-text mb-1"><strong>Tipologia:</strong> ${spazio.tipologia}</p>
            <div class="mb-3">${badge}</div>
            <div class="mt-auto d-grid">
              <a class="btn btn-outline-primary" href="${linkPrenota}">Prenota</a>
            </div>
          </div>
        </div>
      </div>
    `);
  });
}
