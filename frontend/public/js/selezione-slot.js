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
        // Mantieni il timezone locale invece di convertire in UTC
        const year = window.selectedDateInizio.getFullYear();
        const month = String(window.selectedDateInizio.getMonth() + 1).padStart(2, '0');
        const day = String(window.selectedDateInizio.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;

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
        // Formatta la data selezionata per l'API
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const dataSelezionata = formatDate(window.selectedDateInizio);
        console.log('📅 Data per verifica disponibilità:', dataSelezionata);

        const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${window.selectedSpazio.id_spazio}/disponibilita-slot/${dataSelezionata}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const disponibilita = await response.json();
            console.log('📋 Disponibilità per lo spazio:', disponibilita);

            // Verifica se gli slot selezionati sono disponibili
            if (disponibilita.success && disponibilita.data && disponibilita.data.slots) {
                const orarioInizioHour = parseInt(orarioInizio.split(':')[0]);
                const orarioFineHour = parseInt(orarioFine.split(':')[0]);

                console.log('🔍 Verifico disponibilità slot:', disponibilita.data.slots);

                // Controlla se tutti gli slot nell'intervallo sono disponibili
                for (let hour = orarioInizioHour; hour < orarioFineHour; hour++) {
                    const orarioSlot = `${hour.toString().padStart(2, '0')}:00`;
                    const slot = disponibilita.data.slots.find(s => s.orario === orarioSlot);

                    if (!slot || slot.status !== 'available') {
                        console.log(`❌ Slot ${orarioSlot} non disponibile:`, slot);
                        return false;
                    }
                }

                console.log('✅ Tutti gli slot sono disponibili');
                return true;
            }

            return false;
        } else {
            console.error('❌ Errore API disponibilità:', response.status, response.statusText);
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
<<<<<<< HEAD
=======
        // ✅ CONTROLLA SE L'UTENTE PUÒ ACCEDERE A QUESTA PAGINA
        if (!checkUserAccess()) {
            return;
        }

>>>>>>> upstream/main
        // ✅ CONTROLLA SE CI SONO DATI PRENOTAZIONE IN ATTESA (POST-LOGIN)
        restorePendingPrenotazione();

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

        // Inizializza il sistema di gestione slot real-time SOLO quando l'utente seleziona data
        // NON chiamare initializeSlotManager qui - verrà chiamato dopo selezione data
        console.log('⏳ SlotManager verrà inizializzato dopo selezione data...');

        // Nascondi il riepilogo all'inizializzazione
        hideSummary();

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

        // SlotManager verrà inizializzato dopo selezione data, non qui
        console.log('✅ Sedi caricate, SlotManager verrà inizializzato dopo selezione data...');

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

        // SlotManager verrà inizializzato dopo selezione data, non qui
        console.log('✅ Spazi caricati, SlotManager verrà inizializzato dopo selezione data...');

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
        // Inizializza il bottone come disabilitato
        btnBook.disabled = true;
        btnBook.textContent = 'Seleziona orari...';
        btnBook.classList.add('btn-secondary');
        console.log('🔒 Bottone Prenota Ora inizializzato come disabilitato');

        btnBook.addEventListener('click', async function () {
            console.log('🎯 Bottone Prenota Ora cliccato');

            // Controlla se l'utente è autenticato
            const token = localStorage.getItem('token');

            if (!token) {
                // ✅ UTENTE NON AUTENTICATO: Mostra modal di login con riepilogo
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
            // Mantieni il timezone locale invece di convertire in UTC
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const params = new URLSearchParams({
                sede: window.selectedSede.id_sede,
                spazio: window.selectedSpazio.id_spazio,
                dal: formatDate(window.selectedDateInizio),
                al: formatDate(window.selectedDateFine),
                orarioInizio: window.selectedTimeInizio,
                orarioFine: window.selectedTimeFine
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
        button.classList.remove('btn-danger', 'btn-warning', 'btn-secondary', 'btn-outline-primary', 'btn-success');
        button.classList.add('slot-available');
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
            slot.classList.remove('slot-selected', 'slot-intermediate', 'slot-occupied', 'slot-booked', 'slot-expired', 'slot-past-time');
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
        document.querySelectorAll('.slot-selected').forEach(s => {
            s.classList.remove('slot-selected');
            s.classList.add('slot-available');
        });

        // Seleziona il primo slot usando il nuovo SlotManager
        if (slotManager) {
            slotManager.selectSlot(slotElement.dataset.slotId);
        }

        // Aggiungi la classe per lo slot selezionato
        slotElement.classList.remove('slot-available');
        slotElement.classList.add('slot-selected');

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

        // Aggiungi la classe per lo slot selezionato
        slotElement.classList.remove('slot-available');
        slotElement.classList.add('slot-selected');

        window.selectedTimeFine = orario;

        console.log('⏰ Orario fine selezionato:', window.selectedTimeFine);

        // Blocca gli slot intermedi
        blockIntermediateSlots(window.selectedTimeInizio, window.selectedTimeFine);

        // VERIFICA DISPONIBILITÀ FINALE PRIMA DI ABILITARE IL BOTTONE
        console.log('🔍 Verifica disponibilità finale prima di abilitare il bottone...');

        // Controlla se l'utente è autenticato
        const token = localStorage.getItem('token');

        if (!token) {
            // ✅ UTENTE NON AUTENTICATO: Stessa esperienza ma con modal di login
            console.log('👤 Utente non autenticato, abilito bottone e mostro riepilogo');
            document.getElementById('btnBook').disabled = false;
            document.getElementById('btnBook').textContent = 'Prenota Ora (Login Richiesto)';
            document.getElementById('btnBook').classList.remove('btn-secondary');
            document.getElementById('btnBook').classList.add('btn-warning');

            // ✅ MOSTRA RIEPILOGO ANCHE PER UTENTI NON AUTENTICATI
            updateSummary();
            showSummary();

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

        // ✅ SLOT DISPONIBILI - ABILITA IL BOTTONE!
        console.log('✅ Slot disponibili, abilito bottone Prenota Ora');
        document.getElementById('btnBook').disabled = false;
        document.getElementById('btnBook').textContent = 'Prenota Ora';
        document.getElementById('btnBook').classList.remove('btn-warning', 'btn-secondary');
        document.getElementById('btnBook').classList.add('btn-book');

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
            slot.classList.remove('slot-available', 'slot-selected');
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

// Calcola il prezzo della prenotazione
function calculatePrice() {
    if (!window.selectedTimeInizio || !window.selectedTimeFine) {
        return 0;
    }

    // Calcola le ore totali
    const orarioInizio = parseInt(window.selectedTimeInizio.split(':')[0]);
    const orarioFine = parseInt(window.selectedTimeFine.split(':')[0]);
    const oreTotali = orarioFine - orarioInizio;

    // Prezzo base per ora (€15/ora)
    const prezzoPerOra = 15;
    const prezzoTotale = oreTotali * prezzoPerOra;

    console.log(`⏰ Ore calcolate: ${orarioInizio}:00 - ${orarioFine}:00 = ${oreTotali} ore`);
    console.log(`💰 Prezzo: ${oreTotali} ore × €${prezzoPerOra} = €${prezzoTotale}`);

    return prezzoTotale;
}

// Aggiorna riepilogo
function updateSummary() {
    console.log('📋 Aggiornamento riepilogo');

    // Aggiorna i campi del riepilogo
    const summarySede = document.getElementById('summarySede');
    const summaryStanza = document.getElementById('summaryStanza');
    const summaryData = document.getElementById('summaryData');
    const summaryOrario = document.getElementById('summaryOrario');
    const summaryPrezzo = document.getElementById('summaryPrezzo');

    if (summarySede) summarySede.textContent = window.selectedSede ? window.selectedSede.nome : '-';
    if (summaryStanza) summaryStanza.textContent = window.selectedSpazio ? window.selectedSpazio.nome : '-';
    if (summaryData) summaryData.textContent = window.selectedDateInizio ? window.selectedDateInizio.toLocaleDateString('it-IT') : '-';
    if (summaryOrario) summaryOrario.textContent = window.selectedTimeInizio && window.selectedTimeFine ? `${window.selectedTimeInizio} - ${window.selectedTimeFine}` : '-';

    // Calcola il prezzo reale
    if (summaryPrezzo) {
        const prezzo = calculatePrice();
        summaryPrezzo.textContent = `€${prezzo.toFixed(2)}`;
        console.log('💰 Prezzo calcolato:', prezzo);
    }
}

// Mostra riepilogo
function showSummary() {
    console.log('📋 Mostro riepilogo');
    const summaryCard = document.getElementById('summaryCard');
    if (summaryCard) {
        summaryCard.classList.remove('hidden');
        summaryCard.classList.add('active');

        // Aggiorna il riepilogo con i dati attuali
        updateSummary();

        // ✅ ANIMAZIONE: Scorri la pagina verso il basso per mostrare il riepilogo
        setTimeout(() => {
            console.log('🎬 Avvio animazione scorrimento pagina verso il basso...');

            // Calcola la posizione del riepilogo
            const summaryPosition = summaryCard.offsetTop;
            const windowHeight = window.innerHeight;
            const scrollTarget = summaryPosition - (windowHeight * 0.2); // Mostra con 20% di margine sopra

            // Scorri con animazione fluida
            window.scrollTo({
                top: scrollTarget,
                behavior: 'smooth',
                duration: 1000
            });

            console.log('✅ Animazione scorrimento completata, riepilogo ora visibile');
        }, 300); // Aspetta 300ms per permettere all'animazione del riepilogo di iniziare
    }
}

// Nasconde riepilogo
function hideSummary() {
    console.log('📋 Nascondo riepilogo');
    const summaryCard = document.getElementById('summaryCard');
    if (summaryCard) {
        summaryCard.classList.remove('active');
        summaryCard.classList.add('hidden');
    }
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
    console.log('🔐 Mostro modal di autenticazione elegante');

    // Crea il modal HTML se non esiste
    if (!document.getElementById('authModal')) {
        const modalHTML = `
            <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content auth-modal-content">
                        <div class="modal-header auth-modal-header">
                            <div class="d-flex align-items-center">
                                <div class="auth-icon-container me-3">
                                    <i class="fas fa-lock-open auth-icon"></i>
                                </div>
                                <div>
                                    <h4 class="modal-title mb-0" id="authModalLabel">🔐 Autenticazione Richiesta</h4>
                                    <p class="auth-subtitle mb-0">Per completare la prenotazione devi effettuare il login o registrarti</p>
                                </div>
                            </div>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        
                        <div class="modal-body auth-modal-body">
                            <!-- Riquadro riepilogo elegante -->
                            <div class="auth-summary-card">
                                <div class="auth-summary-header">
                                    <i class="fas fa-calendar-check me-2"></i>
                                    <span>Riepilogo Prenotazione</span>
                                </div>
                                <div class="auth-summary-content">
                                    <div class="auth-summary-row">
                                        <div class="auth-summary-label">
                                            <i class="fas fa-building me-2"></i>
                                            <span>Sede:</span>
                                        </div>
                                        <div class="auth-summary-value">${window.selectedSede ? window.selectedSede.nome : 'Non selezionata'}</div>
                                    </div>
                                    <div class="auth-summary-row">
                                        <div class="auth-summary-label">
                                            <i class="fas fa-door-open me-2"></i>
                                            <span>Spazio:</span>
                                        </div>
                                        <div class="auth-summary-value">${window.selectedSpazio ? window.selectedSpazio.nome : 'Non selezionato'}</div>
                                    </div>
                                    <div class="auth-summary-row">
                                        <div class="auth-summary-label">
                                            <i class="fas fa-calendar me-2"></i>
                                            <span>Data:</span>
                                        </div>
                                        <div class="auth-summary-value">${window.selectedDateInizio ? window.selectedDateInizio.toLocaleDateString('it-IT') : 'Non selezionata'}</div>
                                    </div>
                                    <div class="auth-summary-row">
                                        <div class="auth-summary-label">
                                            <i class="fas fa-clock me-2"></i>
                                            <span>Orario:</span>
                                        </div>
                                        <div class="auth-summary-value">${window.selectedTimeInizio ? window.selectedTimeInizio + ' - ' + window.selectedTimeFine : 'Non selezionato'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Messaggio informativo elegante -->
                            <div class="auth-info-message">
                                <div class="auth-info-icon">
                                    <i class="fas fa-info-circle"></i>
                                </div>
                                <div class="auth-info-text">
                                    <strong>Perché devo registrarmi?</strong>
                                    <p>La registrazione ti permette di gestire le tue prenotazioni, ricevere conferme e accedere a servizi esclusivi.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer auth-modal-footer">
                            <button type="button" class="btn btn-outline-secondary auth-btn-cancel" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>
                                Annulla
                            </button>
                            <button type="button" class="btn btn-primary auth-btn-login" onclick="goToLogin()">
                                <i class="fas fa-sign-in-alt me-2"></i>
                                Vai al Login
                            </button>
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
    // ✅ Salva i dati della selezione nel localStorage per ripristinarli dopo il login
    // Mantieni il timezone locale invece di convertire in UTC
    const formatDate = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const selectionData = {
        sede: window.selectedSede,
        spazio: window.selectedSpazio,
        dataInizio: formatDate(window.selectedDateInizio),
        dataFine: formatDate(window.selectedDateFine),
        orarioInizio: window.selectedTimeInizio,
        orarioFine: window.selectedTimeFine
    };

    console.log('💾 Salvando dati prenotazione per post-login:', selectionData);
    localStorage.setItem('pendingPrenotazione', JSON.stringify(selectionData));

    // ✅ SALVA REDIRECT A PAGAMENTO DOPO LOGIN
    localStorage.setItem('redirectAfterLogin', '/pagamento.html');
    console.log('🔄 Redirect dopo login impostato a: /pagamento.html');

    // Reindirizza alla pagina di login
    window.location.href = '/login.html';
}

// ✅ FUNZIONE PER RIPRISTINARE DATI POST-LOGIN
function restorePendingPrenotazione() {
    const pendingData = localStorage.getItem('pendingPrenotazione');
    const redirectUrl = localStorage.getItem('redirectAfterLogin');

    if (pendingData && redirectUrl) {
        console.log('🔄 Ripristino dati prenotazione in attesa:', pendingData);

        try {
            const data = JSON.parse(pendingData);

            // Ripristina i dati selezionati
            if (data.sede && data.spazio && data.dataInizio && data.orarioInizio) {
                console.log('✅ Dati prenotazione ripristinati, reindirizzo a:', redirectUrl);

                // Pulisci i dati dal localStorage
                localStorage.removeItem('pendingPrenotazione');
                localStorage.removeItem('redirectAfterLogin');

                // Reindirizza alla pagina di pagamento
                window.location.href = redirectUrl;
                return;
            }
        } catch (error) {
            console.error('❌ Errore nel ripristino dati prenotazione:', error);
        }
    }
}

<<<<<<< HEAD
=======
// Funzione per verificare se l'utente può accedere a questa pagina
function checkUserAccess() {
    const userStr = localStorage.getItem('user');

    if (userStr) {
        try {
            const user = JSON.parse(userStr);

            // Se l'utente è gestore o amministratore, reindirizza alla dashboard
            if (user.ruolo === 'gestore' || user.ruolo === 'amministratore') {
                console.log('🚫 Accesso negato: utente gestore/amministratore non può prenotare');

                // Mostra messaggio di errore
                showError('I gestori non possono effettuare prenotazioni. Verrai reindirizzato alla dashboard.');

                // Reindirizza alla dashboard dopo 3 secondi
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 3000);

                return false;
            }

            console.log('✅ Accesso consentito per utente:', user.ruolo);
            return true;

        } catch (error) {
            console.error('❌ Errore nel controllo accesso:', error);
            return true; // In caso di errore, permetti l'accesso
        }
    }

    // Utente non loggato può accedere (verrà richiesto il login per prenotare)
    return true;
}

>>>>>>> upstream/main
// Rendi le funzioni disponibili globalmente
window.showAuthModal = showAuthModal;
window.goToLogin = goToLogin;
window.restorePendingPrenotazione = restorePendingPrenotazione;
<<<<<<< HEAD
=======
window.checkUserAccess = checkUserAccess;
>>>>>>> upstream/main

