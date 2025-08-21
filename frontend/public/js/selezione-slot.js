// Configurazione e variabili globali
let sedi = [];
let spazi = [];
let selectedSede = null;
let selectedSpazio = null;
let selectedDateInizio = null;
let selectedDateFine = null;
let selectedTimeInizio = null;
let selectedTimeFine = null;
let datePicker = null;

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', function () {
    console.log('selezione-slot.js - Inizializzazione pagina');

    // Inizializza la navbar universale
    if (typeof window.initializeNavbar === 'function') {
        window.initializeNavbar();
    }

    // Inizializza la pagina
    initializePage();
});

// Inizializza la pagina
async function initializePage() {
    try {
        // Carica le sedi
        await loadSedi();

        // Inizializza il calendario
        initializeCalendar();

        // Configura gli event listener
        setupEventListeners();

        console.log('✅ Pagina inizializzata correttamente');

    } catch (error) {
        console.error('❌ Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);
    }
}

// Carica le sedi disponibili
async function loadSedi() {
    try {
        console.log('🔄 Caricamento sedi...');

        const response = await fetch(`${window.CONFIG.API_BASE}/sedi`);

        if (!response.ok) {
            throw new Error(`Errore caricamento sedi: ${response.status}`);
        }

        sedi = await response.json();
        console.log('✅ Sedi caricate:', sedi);

        // Popola il select delle sedi
        populateSedeSelect();

    } catch (error) {
        console.error('❌ Errore caricamento sedi:', error);
        throw error;
    }
}

// Popola il select delle sedi
function populateSedeSelect() {
    const sedeSelect = document.getElementById('sedeSelect');

    // Pulisci le opzioni esistenti
    sedeSelect.innerHTML = '<option value="">Seleziona una sede...</option>';

    // Aggiungi le sedi
    sedi.forEach(sede => {
        const option = document.createElement('option');
        option.value = sede.id_sede;
        option.textContent = `${sede.nome} - ${sede.citta}`;
        sedeSelect.appendChild(option);
    });
}

// Carica gli spazi per una sede specifica
async function loadSpazi(sedeId) {
    try {
        console.log(`🔄 Caricamento spazi per sede ${sedeId}...`);

        const response = await fetch(`${window.CONFIG.API_BASE}/spazi?id_sede=${sedeId}`);

        if (!response.ok) {
            throw new Error(`Errore caricamento spazi: ${response.status}`);
        }

        spazi = await response.json();
        console.log('✅ Spazi caricati:', spazi);

        // Popola il select degli spazi
        populateSpazioSelect();

    } catch (error) {
        console.error('❌ Errore caricamento spazi:', error);
        showError('Errore caricamento spazi: ' + error.message);
    }
}

// Popola il select degli spazi
function populateSpazioSelect() {
    const spazioSelect = document.getElementById('stanzaSelect');

    // Pulisci le opzioni esistenti
    spazioSelect.innerHTML = '<option value="">Seleziona una stanza...</option>';

    // Aggiungi gli spazi
    spazi.forEach(spazio => {
        const option = document.createElement('option');
        option.value = spazio.id_spazio;
        option.textContent = `${spazio.nome} (${spazio.tipo})`;
        option.dataset.tipo = spazio.tipo;
        option.dataset.capacita = spazio.capacita;
        option.dataset.prezzo = spazio.prezzo_ora || 10; // Prezzo default 10€/ora
        spazioSelect.appendChild(option);
    });

    // Abilita il select
    spazioSelect.disabled = false;
}

// Inizializza il calendario
function initializeCalendar() {
    const datePickerElement = document.getElementById('datePicker');

    // Configurazione Flatpickr per selezione intervallo
    datePicker = flatpickr(datePickerElement, {
        locale: 'it',
        dateFormat: 'd/m/Y',
        minDate: 'today',
        maxDate: new Date().fp_incr(30), // 30 giorni da oggi
        mode: 'range', // Abilita selezione intervallo
        disable: [
            function (date) {
                // Disabilita i weekend (sabato = 6, domenica = 0)
                return date.getDay() === 0 || date.getDay() === 6;
            }
        ],
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                selectedDateInizio = selectedDates[0];
                selectedDateFine = selectedDates[1];
                console.log('📅 Date selezionate:', selectedDateInizio, 'a', selectedDateFine);

                // Carica gli orari disponibili per la data selezionata
                if (selectedSede && selectedSpazio) {
                    loadOrariDisponibili();
                }

                // Aggiorna il riepilogo
                updateSummary();
            } else if (selectedDates.length === 1) {
                // Reset se viene selezionata solo una data
                selectedDateInizio = null;
                selectedDateFine = null;
                hideSummary();
            }
        }
    });

    console.log('✅ Calendario inizializzato');
}

// Configura gli event listener
function setupEventListeners() {
    // Select sede
    document.getElementById('sedeSelect').addEventListener('change', function (e) {
        const sedeId = e.target.value;

        if (sedeId) {
            selectedSede = sedi.find(s => s.id_sede == sedeId);
            console.log('🏢 Sede selezionata:', selectedSede);

            // Carica gli spazi per questa sede
            loadSpazi(sedeId);

            // Reset selezione spazio
            selectedSpazio = null;
            document.getElementById('stanzaSelect').value = '';
            document.getElementById('stanzaSelect').disabled = true;

            // Reset calendario
            if (datePicker) {
                datePicker.clear();
                selectedDateInizio = null;
                selectedDateFine = null;
            }

            // Nascondi riepilogo
            hideSummary();

        } else {
            selectedSede = null;
            document.getElementById('stanzaSelect').disabled = true;
            document.getElementById('stanzaSelect').innerHTML = '<option value="">Prima seleziona una sede...</option>';
        }
    });

    // Select spazio
    document.getElementById('stanzaSelect').addEventListener('change', function (e) {
        const spazioId = e.target.value;

        if (spazioId) {
            selectedSpazio = spazi.find(s => s.id_spazio == spazioId);
            console.log('🚪 Spazio selezionato:', selectedSpazio);

            // Reset calendario
            if (datePicker) {
                datePicker.clear();
                selectedDateInizio = null;
                selectedDateFine = null;
            }

            // Nascondi riepilogo
            hideSummary();

        } else {
            selectedSpazio = null;
        }
    });

    // Pulsante prenota
    document.getElementById('btnBook').addEventListener('click', function () {
        if (validateSelection()) {
            proceedToBooking();
        }
    });
}

// Carica gli orari disponibili per la data selezionata
async function loadOrariDisponibili() {
    if (!selectedSede || !selectedSpazio || !selectedDateInizio || !selectedDateFine) {
        return;
    }

    try {
        showLoading(true);

        console.log(`🔄 Caricamento orari disponibili dal ${selectedDateInizio.toLocaleDateString('it-IT')} al ${selectedDateFine.toLocaleDateString('it-IT')}...`);

        // Per ora, carica tutti gli orari disponibili senza verificare conflitti specifici
        // In futuro si può implementare una verifica più sofisticata
        console.log('📅 Caricamento orari per l\'intervallo selezionato');

        // Simula una risposta di disponibilità (per ora tutti disponibili)
        const disponibilita = { disponibile: true, orari: [] };

        // Mostra gli orari disponibili
        displayTimeSlots(disponibilita);

    } catch (error) {
        console.error('❌ Errore caricamento orari:', error);
        showError('Errore caricamento orari: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Mostra gli slot temporali disponibili
function displayTimeSlots(disponibilita) {
    const timeSlotsContainer = document.getElementById('timeSlots');

    // Orari di apertura (9:00 - 18:00)
    const orariApertura = [];
    for (let hour = 9; hour <= 17; hour++) {
        orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Pulisci il container
    timeSlotsContainer.innerHTML = '';

    // Crea gli slot temporali
    orariApertura.forEach(orario => {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.textContent = orario;
        slot.dataset.orario = orario;

        // Verifica se l'orario è disponibile
        const isAvailable = checkTimeAvailability(orario, disponibilita);

        if (isAvailable) {
            slot.classList.add('available');
            slot.addEventListener('click', () => selectTimeSlot(orario, slot));

            // Aggiungi tooltip per spiegare la selezione
            slot.title = 'Clicca per selezionare orario inizio/fine';
        } else {
            slot.classList.add('occupied');
            slot.title = 'Orario già prenotato';
        }

        timeSlotsContainer.appendChild(slot);
    });

    if (orariApertura.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="text-muted">Nessun orario disponibile per questa data</p>';
    }
}

// Verifica disponibilità di un orario specifico
function checkTimeAvailability(orario, disponibilita) {
    // Logica semplificata: considera disponibile se non ci sono prenotazioni
    // In un'implementazione reale, verificheresti contro le prenotazioni esistenti

    // Per ora, rendiamo disponibili tutti gli orari
    // In futuro, qui si può implementare la logica per verificare conflitti specifici
    return true;
}

// Seleziona uno slot temporale
function selectTimeSlot(orario, slotElement) {
    // Se è già selezionato, lo deseleziona
    if (slotElement.classList.contains('selected')) {
        slotElement.classList.remove('selected');
        selectedTimeInizio = null;
        selectedTimeFine = null;
        hideSummary();
        return;
    }

    // Se è il primo orario selezionato
    if (!selectedTimeInizio) {
        // Rimuovi selezione precedente
        document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));

        // Seleziona il primo slot
        slotElement.classList.add('selected');
        selectedTimeInizio = orario;
        selectedTimeFine = null;

        console.log('⏰ Orario inizio selezionato:', selectedTimeInizio);

        // Mostra messaggio per selezionare l'orario di fine
        showTimeSelectionMessage('Seleziona ora l\'orario di fine');

    } else {
        // È il secondo orario (fine)
        // Verifica che sia successivo all'orario di inizio
        const orarioInizio = parseInt(selectedTimeInizio.split(':')[0]);
        const orarioFine = parseInt(orario.split(':')[0]);

        if (orarioFine <= orarioInizio) {
            showError('L\'orario di fine deve essere successivo all\'orario di inizio');
            return;
        }

        // Seleziona il secondo slot
        slotElement.classList.add('selected');
        selectedTimeFine = orario;

        console.log('⏰ Orario fine selezionato:', selectedTimeFine);

        // Aggiorna il riepilogo
        updateSummary();

        // Mostra il riepilogo
        showSummary();
    }
}

// Aggiorna il riepilogo della selezione
function updateSummary() {
    if (selectedSede && selectedSpazio && selectedDateInizio && selectedDateFine && selectedTimeInizio && selectedTimeFine) {
        document.getElementById('summarySede').textContent = selectedSede.nome;
        document.getElementById('summaryStanza').textContent = selectedSpazio.nome;
        document.getElementById('summaryData').textContent = `${selectedDateInizio.toLocaleDateString('it-IT')} - ${selectedDateFine.toLocaleDateString('it-IT')}`;
        document.getElementById('summaryOrario').textContent = `${selectedTimeInizio} - ${selectedTimeFine}`;

        // Calcola il prezzo totale per il numero di giorni e ore
        const giorni = Math.ceil((selectedDateFine - selectedDateInizio) / (1000 * 60 * 60 * 24)) + 1;
        const ore = parseInt(selectedTimeFine.split(':')[0]) - parseInt(selectedTimeInizio.split(':')[0]);
        const prezzoTotale = (selectedSpazio.prezzo_ora || 10) * giorni * Math.max(1, ore);
        document.getElementById('summaryPrezzo').textContent = prezzoTotale;

        // Abilita il pulsante prenota
        document.getElementById('btnBook').disabled = false;
    }
}

// Mostra il riepilogo
function showSummary() {
    document.getElementById('summaryCard').style.display = 'block';
}

// Nascondi il riepilogo
function hideSummary() {
    document.getElementById('summaryCard').style.display = 'none';
    document.getElementById('btnBook').disabled = true;

    // Rimuovi messaggi di selezione orario
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (timeSlotsContainer) {
        timeSlotsContainer.querySelectorAll('.alert').forEach(alert => alert.remove());
    }
}

// Valida la selezione completa
function validateSelection() {
    if (!selectedSede) {
        showError('Seleziona una sede');
        return false;
    }

    if (!selectedSpazio) {
        showError('Seleziona una stanza');
        return false;
    }

    if (!selectedDateInizio || !selectedDateFine) {
        showError('Seleziona un intervallo di date');
        return false;
    }

    if (!selectedTimeInizio || !selectedTimeFine) {
        showError('Seleziona un intervallo di orari (inizio e fine)');
        return false;
    }

    return true;
}

// Procede alla prenotazione
function proceedToBooking() {
    try {
        console.log('🚀 Procedo alla prenotazione...');

        // Controlla se l'utente è loggato
        const userId = localStorage.getItem('userId');
        const userToken = localStorage.getItem('userToken');

        if (!userId || !userToken) {
            console.log('🔐 Utente non loggato, reindirizzamento al login...');

            // Salva i dati della prenotazione per il redirect post-login
            const prenotazioneData = {
                sede: selectedSede.id_sede,
                spazio: selectedSpazio.id_spazio,
                dataInizio: selectedDateInizio.toISOString(),
                dataFine: selectedDateFine.toISOString(),
                orarioInizio: selectedTimeInizio,
                orarioFine: selectedTimeFine,
                prezzo: selectedSpazio.prezzo_ora || 10
            };

            localStorage.setItem('pendingPrenotazione', JSON.stringify(prenotazioneData));

            // Reindirizza al login
            window.location.href = 'login.html?redirect=prenotazione';
            return;
        }

        // Utente loggato, procede al pagamento
        console.log('✅ Utente loggato, procedo al pagamento...');

        // Prepara i parametri per la pagina di prenotazione
        const params = new URLSearchParams({
            sede: selectedSede.id_sede,
            spazio: selectedSpazio.id_spazio,
            dal: selectedDateInizio.toISOString(),
            al: selectedDateFine.toISOString(),
            orarioInizio: selectedTimeInizio,
            orarioFine: selectedTimeFine
        });

        // Reindirizza alla pagina di prenotazione
        window.location.href = `pagamento.html?${params.toString()}`;

    } catch (error) {
        console.error('❌ Errore durante il reindirizzamento:', error);
        showError('Errore durante il reindirizzamento: ' + error.message);
    }
}

// Mostra/nasconde il loading
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Mostra messaggio di errore
function showError(message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'error');
    } else {
        alert('Errore: ' + message);
    }
}

// Mostra messaggio di selezione orario
function showTimeSelectionMessage(message) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    const messageElement = document.createElement('div');
    messageElement.className = 'alert alert-info mt-3';
    messageElement.innerHTML = `
        <i class="fas fa-info-circle me-2"></i>
        ${message}
    `;

    // Rimuovi messaggi precedenti
    timeSlotsContainer.querySelectorAll('.alert').forEach(alert => alert.remove());

    // Aggiungi il nuovo messaggio
    timeSlotsContainer.appendChild(messageElement);
}

// Mostra messaggio di successo
function showSuccess(message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'success');
    } else {
        alert('Successo: ' + message);
    }
}
