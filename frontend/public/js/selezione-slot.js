// Configurazione e variabili globali
let sedi = [];
let spazi = [];
let selectedSede = null;
let selectedSpazio = null;
let selectedDate = null;
let selectedTime = null;
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

    // Configurazione Flatpickr
    datePicker = flatpickr(datePickerElement, {
        locale: 'it',
        dateFormat: 'd/m/Y',
        minDate: 'today',
        maxDate: new Date().fp_incr(30), // 30 giorni da oggi
        disable: [
            function (date) {
                // Disabilita i weekend (sabato = 6, domenica = 0)
                return date.getDay() === 0 || date.getDay() === 6;
            }
        ],
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                selectedDate = selectedDates[0];
                console.log('📅 Data selezionata:', selectedDate);

                // Carica gli orari disponibili per la data selezionata
                if (selectedSede && selectedSpazio) {
                    loadOrariDisponibili();
                }

                // Aggiorna il riepilogo
                updateSummary();
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
                selectedDate = null;
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
                selectedDate = null;
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
    if (!selectedSede || !selectedSpazio || !selectedDate) {
        return;
    }

    try {
        showLoading(true);

        console.log(`🔄 Caricamento orari disponibili per ${selectedDate.toLocaleDateString('it-IT')}...`);

                // Formatta la data per l'API
        const dataFormatted = selectedDate.toISOString().split('T')[0];
        
                // Per ora, carica tutti gli orari disponibili senza verificare conflitti specifici
        // In futuro si può implementare una verifica più sofisticata
        console.log('📅 Caricamento orari per la data selezionata');
        
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
    // Rimuovi selezione precedente
    document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));

    // Seleziona il nuovo slot
    slotElement.classList.add('selected');
    selectedTime = orario;

    console.log('⏰ Orario selezionato:', selectedTime);

    // Aggiorna il riepilogo
    updateSummary();

    // Mostra il riepilogo
    showSummary();
}

// Aggiorna il riepilogo della selezione
function updateSummary() {
    if (selectedSede && selectedSpazio && selectedDate && selectedTime) {
        document.getElementById('summarySede').textContent = selectedSede.nome;
        document.getElementById('summaryStanza').textContent = selectedSpazio.nome;
        document.getElementById('summaryData').textContent = selectedDate.toLocaleDateString('it-IT');
        document.getElementById('summaryOrario').textContent = selectedTime;
        document.getElementById('summaryPrezzo').textContent = selectedSpazio.prezzo_ora || 10;

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

    if (!selectedDate) {
        showError('Seleziona una data');
        return false;
    }

    if (!selectedTime) {
        showError('Seleziona un orario');
        return false;
    }

    return true;
}

// Procede alla prenotazione
function proceedToBooking() {
    try {
        console.log('🚀 Procedo alla prenotazione...');

        // Prepara i parametri per la pagina di prenotazione
        const params = new URLSearchParams({
            sede: selectedSede.id_sede,
            spazio: selectedSpazio.id_spazio,
            dal: selectedDate.toISOString(),
            al: new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString() // +1 ora
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

// Mostra messaggio di successo
function showSuccess(message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'success');
    } else {
        alert('Successo: ' + message);
    }
}
