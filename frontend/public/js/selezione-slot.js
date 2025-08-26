// Configurazione e variabili globali
window.sedi = [];
window.spazi = [];
window.selectedSede = null;
window.selectedSpazio = null;
window.selectedDateInizio = null;
window.selectedDateFine = null;
window.selectedTimeInizio = null;
window.selectedTimeFine = null;
let datePicker = null;

// Nuovo Slot Manager per gestione real-time degli slot con SSE
let slotManager = null;

// Inizializza il nuovo Slot Manager
function initializeSlotManager() {
    if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
        const sedeId = window.selectedSede.id_sede;
        const spazioId = window.selectedSpazio.id_spazio;
        const date = window.selectedDateInizio.toISOString().split('T')[0];

        console.log('🚀 Inizializzazione nuovo Slot Manager per:', { sedeId, spazioId, date });

        // Pulisci istanza precedente se esiste
        if (slotManager) {
            slotManager.cleanup();
        }

        // PRIMA crea i bottoni degli slot
        console.log('🔨 STEP 1: Creo i bottoni degli slot...');
        createTimeSlots();
        console.log('✅ STEP 1 COMPLETATO: Bottoni creati');

        // POI crea nuova istanza di SlotManager
        console.log('🚀 STEP 2: Creo SlotManager...');
        slotManager = new window.SlotManager();
        slotManager.init(sedeId, spazioId, date);
        console.log('✅ STEP 2 COMPLETATO: SlotManager inizializzato');

        return true;
    }
    return false;
}

// Funzione helper per verificare disponibilità di uno slot
async function checkAvailability(orarioInizio, orarioFine) {
    console.log('🔍 checkAvailability chiamato per:', { orarioInizio, orarioFine });

    try {
        const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${window.selectedSpazio.id_spazio}/disponibilita`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const disponibilita = await response.json();
            console.log('📋 Disponibilità per lo spazio:', disponibilita);

            // Verifica se lo spazio è disponibile per la data e orario selezionati
            return disponibilita.disponibile;
        }
    } catch (error) {
        console.error('❌ Errore verifica disponibilità:', error);
    }

    return false;
}

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 selezione-slot.js - DOMContentLoaded - Pagina caricata!');
    console.log('📍 URL corrente:', window.location.href);
    console.log('📄 Nome pagina:', window.location.pathname);

    // Inizializza la navbar universale
    if (typeof window.initializeNavbar === 'function') {
        console.log('✅ Funzione initializeNavbar disponibile');
        window.initializeNavbar();
    } else {
        console.log('❌ Funzione initializeNavbar non disponibile');
    }

    // Inizializza la pagina
    console.log('🔄 Chiamo initializePage...');
    initializePage();
});

// Inizializza la pagina
async function initializePage() {
    console.log('🚀 FUNZIONE INITIALIZEPAGE CHIAMATA!');

    try {
        console.log('🔄 Caricamento sedi...');
        // Carica le sedi
        await loadSedi();

        console.log('🔄 Inizializzazione calendario...');
        // Inizializza il calendario
        initializeCalendar();

        console.log('🔄 Configurazione event listener...');
        // Configura gli event listener
        setupEventListeners();

        console.log('🔄 Gestione parametri URL...');
        // Gestisci i parametri URL se presenti
        handleUrlParameters();

        console.log('✅ Pagina inizializzata correttamente');

        // Inizializza il sistema di gestione slot real-time solo se le sedi sono caricate
        if (window.sediLoaded) {
            initializeSlotManager();
        } else {
            console.log('⏳ Sedi non ancora caricate, rimando inizializzazione slot manager...');
        }

    } catch (error) {
        console.error('❌ Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);
    }
}

// Carica le sedi disponibili
async function loadSedi() {
    try {
        console.log('🔄 Caricamento sedi...');
        console.log('📍 API Base:', window.CONFIG.API_BASE);
        console.log('⏰ Inizio richiesta:', new Date().toISOString());

        const startTime = Date.now();

        const response = await fetch(`${window.CONFIG.API_BASE}/sedi`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ Richiesta completata in ${duration}ms`);
        console.log(`📊 Status: ${response.status}`);
        console.log(`🔗 Headers:`, response.headers);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        window.sedi = await response.json();
        console.log('✅ Sedi caricate:', window.sedi);
        console.log('📋 Numero sedi:', window.sedi.length);

        // Popola il dropdown delle sedi
        populateSediDropdown();
        window.sediLoaded = true;

        // Inizializza il slot manager se tutto è pronto
        if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
            initializeSlotManager();
        }

    } catch (error) {
        console.error('❌ Errore caricamento sedi:', error);
        showError('Errore nel caricamento delle sedi: ' + error.message);
        throw error;
    }
}

// Popola il dropdown delle sedi
function populateSediDropdown() {
    const sedeSelect = document.getElementById('sedeSelect');
    if (!sedeSelect) {
        console.error('❌ Dropdown sedi non trovato!');
        return;
    }

    // Pulisci opzioni esistenti
    sedeSelect.innerHTML = '<option value="">Seleziona una sede...</option>';

    // Aggiungi le sedi
    window.sedi.forEach(sede => {
        const option = document.createElement('option');
        option.value = sede.id_sede;
        option.textContent = sede.nome;
        sedeSelect.appendChild(option);
    });

    console.log('✅ Dropdown sedi popolato con', window.sedi.length, 'sedi');
}

// Carica gli spazi per una sede
async function loadSpazi(sedeId) {
    try {
        console.log(`🔄 Caricamento spazi per sede ${sedeId}...`);
        console.log('📍 API Base:', `${window.CONFIG.API_BASE}/spazi?id_sede=${sedeId}`);

        const startTime = Date.now();

        const response = await fetch(`${window.CONFIG.API_BASE}/spazi?id_sede=${sedeId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ Richiesta spazi completata in ${duration}ms`);
        console.log(`📊 Status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        window.spazi = await response.json();
        console.log('✅ Spazi caricati:', window.spazi);
        console.log('📋 Numero spazi:', window.spazi.length);

        // Popola il dropdown degli spazi
        populateSpaziDropdown();

        // Inizializza il slot manager se tutto è pronto
        if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
            initializeSlotManager();
        }

    } catch (error) {
        console.error('❌ Errore caricamento spazi:', error);
        showError('Errore nel caricamento degli spazi: ' + error.message);
    }
}

// Popola il dropdown degli spazi
function populateSpaziDropdown() {
    const spazioSelect = document.getElementById('stanzaSelect');
    if (!spazioSelect) {
        console.error('❌ Dropdown spazi non trovato!');
        return;
    }

    // Pulisci opzioni esistenti
    spazioSelect.innerHTML = '<option value="">Seleziona uno spazio...</option>';

    // Aggiungi gli spazi
    window.spazi.forEach(spazio => {
        const option = document.createElement('option');
        option.value = spazio.id_spazio;
        option.textContent = spazio.nome;
        spazioSelect.appendChild(option);
    });

    console.log('✅ Dropdown spazi popolato con', window.spazi.length, 'spazi');
}

// Inizializza il calendario
function initializeCalendar() {
    console.log('🔄 Inizializzazione calendario...');

    const datePickerElement = document.getElementById('datePicker');
    if (!datePickerElement) {
        console.error('❌ Elemento datePicker non trovato!');
        return;
    }

    // Configurazione Flatpickr
    datePicker = flatpickr(datePickerElement, {
        locale: 'it',
        mode: 'range',
        dateFormat: 'd/m/Y',
        minDate: 'today',
        maxDate: new Date().fp_incr(365), // 1 anno da oggi
        allowInput: true,
        clickOpens: true,
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                window.selectedDateInizio = selectedDates[0];
                window.selectedDateFine = selectedDates[1];
                console.log('📅 Date selezionate:', window.selectedDateInizio, 'a', window.selectedDateFine);

                // Inizializza il slot manager se tutto è pronto
                if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
                    initializeSlotManager();
                }
            }
        }
    });

    console.log('✅ Calendario inizializzato');
}

// Configura gli event listener
function setupEventListeners() {
    console.log('🔄 Configurazione event listener...');

    // Event listener per selezione sede
    const sedeSelect = document.getElementById('sedeSelect');
    if (sedeSelect) {
        sedeSelect.addEventListener('change', function () {
            const sedeId = this.value;
            if (sedeId) {
                const sede = window.sedi.find(s => s.id_sede == sedeId);
                window.selectedSede = sede;
                console.log('🏢 Sede selezionata:', sede);

                // Carica spazi per questa sede
                loadSpazi(sedeId);

                // Abilita dropdown spazi
                document.getElementById('stanzaSelect').disabled = false;
            } else {
                window.selectedSede = null;
                window.selectedSpazio = null;
                document.getElementById('stanzaSelect').disabled = true;
                document.getElementById('stanzaSelect').innerHTML = '<option value="">Prima seleziona una sede...</option>';
            }
        });
    }

    // Event listener per selezione spazio
    const spazioSelect = document.getElementById('stanzaSelect');
    if (spazioSelect) {
        spazioSelect.addEventListener('change', function () {
            const spazioId = this.value;
            if (spazioId) {
                const spazio = window.spazi.find(s => s.id_spazio == spazioId);
                window.selectedSpazio = spazio;
                console.log('🚪 Spazio selezionato:', spazio);

                // Inizializza il slot manager se tutto è pronto
                if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
                    initializeSlotManager();
                }
            } else {
                window.selectedSpazio = null;
            }
        });
    }

    // Event listener per il bottone "Prenota Ora"
    const btnBook = document.getElementById('btnBook');
    if (btnBook) {
        btnBook.addEventListener('click', async function () {
            console.log('🎯 Bottone Prenota Ora cliccato');

            // Controlla se l'utente è autenticato
            const token = localStorage.getItem('token');

            if (!token) {
                // Utente non autenticato: mostra modal di login
                console.log('👤 Utente non autenticato, mostro modal di login');
                if (window.showAuthModal) {
                    window.showAuthModal();
                } else {
                    // Fallback: reindirizza alla pagina di login
                    window.location.href = '/login.html';
                }
                return;
            }

            // Utente autenticato: procedi con la prenotazione
            console.log('🔐 Utente autenticato, procedo con prenotazione');

            // Verifica che tutti i campi siano selezionati
            if (!window.selectedSede || !window.selectedSpazio || !window.selectedDateInizio || !window.selectedTimeInizio || !window.selectedTimeFine) {
                showError('Seleziona tutti i campi richiesti prima di procedere');
                return;
            }

            // Crea l'URL per la pagina di pagamento con i parametri
            const params = new URLSearchParams({
                sede: window.selectedSede.id_sede,
                spazio: window.selectedSpazio.id_spazio,
                data_inizio: window.selectedDateInizio.toISOString().split('T')[0],
                data_fine: window.selectedDateFine.toISOString().split('T')[0],
                time_inizio: window.selectedTimeInizio,
                time_fine: window.selectedTimeFine
            });

            // Reindirizza alla pagina di pagamento
            window.location.href = `/pagamento.html?${params.toString()}`;
        });
    }

    console.log('✅ Event listener configurati');
}

// Gestisce i parametri URL
function handleUrlParameters() {
    console.log('🔄 Gestione parametri URL...');

    const urlParams = new URLSearchParams(window.location.search);
    const sedeId = urlParams.get('sede');
    const spazioId = urlParams.get('spazio');
    const data = urlParams.get('data');

    if (sedeId && spazioId && data) {
        console.log('📍 Parametri URL trovati:', { sedeId, spazioId, data });

        // Seleziona sede
        const sedeSelect = document.getElementById('sedeSelect');
        if (sedeSelect) {
            sedeSelect.value = sedeId;
            sedeSelect.dispatchEvent(new Event('change'));
        }

        // La selezione dello spazio avverrà automaticamente dopo il caricamento delle sedi
    }

    console.log('✅ Gestione parametri URL completata');
}

// Crea gli slot temporali (versione semplificata per SlotManager)
function createTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlots');

    console.log('🔨 createTimeSlots chiamata, container:', timeSlotsContainer);

    if (!timeSlotsContainer) {
        console.error('❌ Container timeSlots non trovato!');
        return;
    }

    // Orari di apertura (9:00 - 18:00)
    const orariApertura = [];
    for (let hour = 9; hour <= 17; hour++) {
        orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    console.log('⏰ Orari apertura:', orariApertura);

    // Pulisci il container
    timeSlotsContainer.innerHTML = '';

    // Crea gli slot temporali
    for (let i = 0; i < orariApertura.length; i++) {
        const orario = orariApertura[i];
        console.log('🔨 Creo slot per orario:', orario);

        const slot = document.createElement('button');
        slot.className = 'btn btn-lg slot-button slot-available';
        slot.textContent = orario;
        slot.dataset.orario = orario;
        slot.dataset.slotId = i + 1; // ID univoco per ogni slot

        // Aggiungi event listener per tutti gli slot
        slot.addEventListener('click', () => selectTimeSlot(orario, slot));
        slot.title = 'Clicca per selezionare orario inizio/fine';

        timeSlotsContainer.appendChild(slot);
        console.log('✅ Slot creato e aggiunto:', slot);
    }

    // Mostra il container
    timeSlotsContainer.style.display = 'block';

    // Assicurati che il container sia visibile
    const timeSlotsSection = document.getElementById('timeSlots');
    if (timeSlotsSection) {
        timeSlotsSection.style.display = 'block';
        console.log('🎯 Sezione timeSlots resa visibile');
    }

    console.log('🎯 Container slot mostrato, slot creati:', timeSlotsContainer.children.length);
    console.log('🔍 Bottoni disponibili nel DOM:', document.querySelectorAll('[data-slot-id]').length);
    console.log('🔍 Bottoni disponibili nel DOM:', document.querySelectorAll('[data-slot-id]'));
}

// Mostra gli slot temporali disponibili (versione originale per compatibilità)
async function displayTimeSlots(disponibilita) {
    const timeSlotsContainer = document.getElementById('timeSlots');

    console.log('🔍 displayTimeSlots chiamata, container:', timeSlotsContainer);

    if (!timeSlotsContainer) {
        console.error('❌ Container timeSlots non trovato!');
        return;
    }

    // Orari di apertura (9:00 - 18:00)
    const orariApertura = [];
    for (let hour = 9; hour <= 17; hour++) {
        orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    console.log('⏰ Orari apertura:', orariApertura);

    // Pulisci il container
    timeSlotsContainer.innerHTML = '';

    // Crea gli slot temporali
    for (let i = 0; i < orariApertura.length; i++) {
        const orario = orariApertura[i];
        console.log('🔨 Creo slot per orario:', orario);

        const slot = document.createElement('button');
        slot.className = 'btn btn-lg slot-button slot-available';
        slot.textContent = orario;
        slot.dataset.orario = orario;
        slot.dataset.slotId = i + 1; // ID univoco per ogni slot

        // Aggiungi event listener per tutti gli slot
        slot.addEventListener('click', () => selectTimeSlot(orario, slot));
        slot.title = 'Clicca per selezionare orario inizio/fine';

        timeSlotsContainer.appendChild(slot);
        console.log('✅ Slot creato e aggiunto:', slot);
    }

    // Mostra il container
    timeSlotsContainer.style.display = 'block';

    // Assicurati che il container sia visibile
    const timeSlotsSection = document.getElementById('timeSlots');
    if (timeSlotsSection) {
        timeSlotsSection.style.display = 'block';
        console.log('🎯 Sezione timeSlots resa visibile');
    }

    console.log('🎯 Container slot mostrato, slot creati:', timeSlotsContainer.children.length);

    // Mostra tutti gli slot come disponibili (SlotManager si occuperà di aggiornarli)
    const allButtons = document.querySelectorAll('[data-slot-id]');
    allButtons.forEach(button => {
        button.classList.remove('btn-danger', 'btn-warning', 'btn-secondary', 'btn-outline-primary');
        button.classList.add('btn-success', 'slot-available');
        button.disabled = false;
        button.title = 'Clicca per selezionare orario inizio/fine';
    });

    if (orariApertura.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="text-muted">Nessun orario disponibile per questa data</p>';
    }
}

// Seleziona uno slot temporale
async function selectTimeSlot(orario, slotElement) {
    console.log('🎯 selectTimeSlot chiamata:', { orario, slotElement, classList: slotElement.classList.toString() });

    // Se è già selezionato, lo deseleziona
    if (slotElement.classList.contains('slot-selected')) {
        console.log('🔄 Deseleziono slot:', orario);
        slotElement.classList.remove('slot-selected');
        window.selectedTimeInizio = null;
        window.selectedTimeFine = null;

        // Rimuovi tutti i blocchi e ripristina gli slot
        document.querySelectorAll('.slot-button').forEach(slot => {
            // Rimuovi tutte le classi di stato
            slot.classList.remove('slot-selected', 'slot-intermediate');
            // Ripristina la classe 'slot-available' per tutti gli slot
            slot.classList.add('slot-available');
            // Ripristina il titolo originale
            slot.title = 'Clicca per selezionare orario inizio/fine';
        });

        hideSummary();
        return;
    }

    // Se è il primo orario selezionato
    if (!selectedTimeInizio) {
        // Rimuovi selezione precedente
        document.querySelectorAll('.slot-selected').forEach(s => s.classList.remove('slot-selected'));

        // Seleziona il primo slot usando il nuovo SlotManager
        if (slotManager) {
            slotManager.selectSlot(slotElement.dataset.slotId);
        }

        window.selectedTimeInizio = orario;
        window.selectedTimeFine = null;

        console.log('⏰ Orario inizio selezionato:', window.selectedTimeInizio);
        console.log('🎨 Slot selezionato, classi:', slotElement.classList.toString());

        // Mostra messaggio per selezionare l'orario di fine
        showTimeSelectionMessage('Seleziona ora l\'orario di fine');

    } else {
        // È il secondo orario (fine)
        // Verifica che sia successivo all'orario di inizio
        const orarioInizio = parseInt(window.selectedTimeInizio.split(':')[0]);
        const orarioFine = parseInt(orario.split(':')[0]);

        if (orarioFine <= orarioInizio) {
            showError('L\'orario di fine deve essere successivo all\'orario di inizio');
            return;
        }

        // Seleziona il secondo slot
        if (slotManager) {
            slotManager.selectSlot(slotElement.dataset.slotId);
        }

        window.selectedTimeFine = orario;

        console.log('⏰ Orario fine selezionato:', window.selectedTimeFine);

        // Blocca gli slot intermedi
        blockIntermediateSlots(window.selectedTimeInizio, window.selectedTimeFine);

        // VERIFICA DISPONIBILITÀ FINALE PRIMA DI ABILITARE IL BOTTONE
        console.log('🔍 Verifica disponibilità finale prima di abilitare il bottone...');

        // Controlla se l'utente è autenticato
        const token = localStorage.getItem('token');

        if (!token) {
            // Utente non autenticato: abilita bottone per reindirizzamento al login
            console.log('👤 Utente non autenticato, abilito bottone per reindirizzamento al login');
            document.getElementById('btnBook').disabled = false;
            document.getElementById('btnBook').textContent = 'Prenota Ora (Login Richiesto)';
            document.getElementById('btnBook').classList.add('btn-warning');

            // Mostra messaggio informativo
            showInfo('Orari selezionati! Effettua il login per completare la prenotazione.');
            return;
        }

        // Utente autenticato: verifica disponibilità
        const disponibile = await checkAvailability(window.selectedTimeInizio, window.selectedTimeFine);

        if (!disponibile) {
            // Slot non disponibile, disabilita il bottone e mostra errore
            document.getElementById('btnBook').disabled = true;
            document.getElementById('btnBook').textContent = 'Slot Non Disponibile';
            showError('🚫 Slot non disponibile per l\'orario selezionato');
            return;
        }

        // Aggiorna il riepilogo
        updateSummary();

        // Mostra il riepilogo
        showSummary();
    }
}

// Blocca gli slot intermedi
function blockIntermediateSlots(orarioInizio, orarioFine) {
    const orarioInizioHour = parseInt(orarioInizio.split(':')[0]);
    const orarioFineHour = parseInt(orarioFine.split(':')[0]);

    document.querySelectorAll('.slot-button').forEach(slot => {
        const orario = slot.textContent.trim();
        const orarioHour = parseInt(orario.split(':')[0]);

        if (orarioHour > orarioInizioHour && orarioHour < orarioFineHour) {
            slot.classList.remove('slot-available');
            slot.classList.add('slot-intermediate');
            slot.disabled = true;
            slot.title = 'Orario intermedio selezionato';
        }
    });
}

// Mostra messaggio per selezione orario
function showTimeSelectionMessage(message) {
    // Implementa la logica per mostrare il messaggio
    console.log('💬 Messaggio:', message);
}

// Mostra errore
function showError(message) {
    // Implementa la logica per mostrare l'errore
    console.error('❌ Errore:', message);
}

// Mostra messaggio informativo
function showInfo(message) {
    // Implementa la logica per mostrare il messaggio informativo
    console.log('ℹ️ Info:', message);
}

// Aggiorna riepilogo
function updateSummary() {
    // Implementa la logica per aggiornare il riepilogo
    console.log('📋 Aggiornamento riepilogo');
}

// Mostra riepilogo
function showSummary() {
    // Implementa la logica per mostrare il riepilogo
    console.log('📋 Mostro riepilogo');
}

// Nasconde riepilogo
function hideSummary() {
    // Implementa la logica per nascondere il riepilogo
    console.log('📋 Nascondo riepilogo');
}

// Funzione helper per ottenere headers di autenticazione
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Funzione per mostrare il modal di autenticazione
function showAuthModal() {
    console.log('🔐 Mostro modal di autenticazione');

    // Crea il modal HTML se non esiste
    if (!document.getElementById('authModal')) {
        const modalHTML = `
            <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="authModalLabel">🔐 Autenticazione Richiesta</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Per completare la prenotazione devi effettuare il login o registrarti.</p>
                            <p><strong>Orari selezionati:</strong></p>
                            <ul>
                                <li><strong>Sede:</strong> ${window.selectedSede ? window.selectedSede.nome : 'Non selezionata'}</li>
                                <li><strong>Spazio:</strong> ${window.selectedSpazio ? window.selectedSpazio.nome : 'Non selezionato'}</li>
                                <li><strong>Data:</strong> ${window.selectedDateInizio ? window.selectedDateInizio.toLocaleDateString('it-IT') : 'Non selezionata'}</li>
                                <li><strong>Orario:</strong> ${window.selectedTimeInizio ? window.selectedTimeInizio + ' - ' + window.selectedTimeFine : 'Non selezionato'}</li>
                            </ul>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                            <button type="button" class="btn btn-primary" onclick="goToLogin()">Vai al Login</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Mostra il modal
    const modal = new bootstrap.Modal(document.getElementById('authModal'));
    modal.show();
}

// Funzione per andare al login
function goToLogin() {
    // Salva i dati della selezione nel localStorage per ripristinarli dopo il login
    const selectionData = {
        sede: window.selectedSede,
        spazio: window.selectedSpazio,
        dataInizio: window.selectedDateInizio ? window.selectedDateInizio.toISOString().split('T')[0] : null,
        dataFine: window.selectedDateFine ? window.selectedDateFine.toISOString().split('T')[0] : null,
        orarioInizio: window.selectedTimeInizio,
        orarioFine: window.selectedTimeFine
    };

    console.log('💾 Salvando dati prenotazione:', selectionData);
    localStorage.setItem('pendingPrenotazione', JSON.stringify(selectionData));

    // Salva anche l'URL di redirect per il post-login
    localStorage.setItem('redirectAfterLogin', '/selezione-slot.html');
    console.log('🔄 Redirect dopo login impostato a: /selezione-slot.html');

    // Reindirizza alla pagina di login
    window.location.href = '/login.html';
}

// Rendi le funzioni disponibili globalmente
window.showAuthModal = showAuthModal;
window.goToLogin = goToLogin;
