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

        // Nota: il redirect post-login ora gestisce direttamente il passaggio al pagamento

        console.log('✅ Pagina inizializzata correttamente');

        // Avvia l'aggiornamento automatico degli slot scaduti
        startAutoUpdate();

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

// Gestisce i parametri URL per pre-selezionare sede, spazio e date
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Gestisci sede
    const sedeId = urlParams.get('sede');
    if (sedeId) {
        console.log('🔄 Pre-selezione sede da URL:', sedeId);
        setTimeout(() => {
            document.getElementById('sedeSelect').value = sedeId;
            // Trigger change event per caricare gli spazi
            document.getElementById('sedeSelect').dispatchEvent(new Event('change'));
        }, 100);
    }

    // Gestisci spazio
    const spazioId = urlParams.get('spazio');
    if (spazioId) {
        console.log('🔄 Pre-selezione spazio da URL:', spazioId);
        // Aspetta che gli spazi siano caricati
        setTimeout(() => {
            document.getElementById('stanzaSelect').value = spazioId;
            document.getElementById('stanzaSelect').dispatchEvent(new Event('change'));
        }, 500);
    }

    // Gestisci date (dal catalogo)
    const dataInizio = urlParams.get('dataInizio');
    const dataFine = urlParams.get('dataFine');
    if (dataInizio && dataFine) {
        console.log('🔄 Pre-selezione date da URL:', dataInizio, dataFine);
        // Aspetta che il calendario sia inizializzato
        setTimeout(() => {
            if (datePicker) {
                datePicker.setDate([dataInizio, dataFine], true);
                // Trigger change event per aggiornare la selezione
                document.dispatchEvent(new Event('dateSelected'));
            }
        }, 1000);
    }
}

// Nota: la gestione del redirect post-login è ora gestita direttamente in main.js
// per reindirizzare al pagamento senza passare per selezione-slot

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
        console.log('🖱️ Pulsante Prenota Ora cliccato!');
        if (validateSelection()) {
            console.log('✅ Selezione valida, chiamo proceedToBooking');
            proceedToBooking().catch(error => {
                console.error('❌ Errore in proceedToBooking:', error);
                showError('Errore durante la prenotazione: ' + error.message);
            });
        } else {
            console.log('❌ Selezione non valida, non chiamo proceedToBooking');
        }
    });
}

// Carica gli orari disponibili per la data selezionata
async function loadOrariDisponibili() {
    if (!selectedSede || !selectedSpazio || !selectedDateInizio || !selectedDateFine) {
        return;
    }

    try {
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
    }
}

// Mostra gli slot temporali disponibili
async function displayTimeSlots(disponibilita) {
    const timeSlotsContainer = document.getElementById('timeSlots');

    // Orari di apertura (9:00 - 18:00)
    const orariApertura = [];
    for (let hour = 9; hour <= 17; hour++) {
        orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Pulisci il container
    timeSlotsContainer.innerHTML = '';

            // Crea gli slot temporali
        for (const orario of orariApertura) {
            console.log('🔨 Creo slot per orario:', orario);
            
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = orario;
            slot.dataset.orario = orario;

        // Verifica se l'orario è disponibile (ora asincrona)
        const availability = await checkTimeAvailability(orario, disponibilita);

        if (availability.available) {
            slot.classList.add('available');
            slot.addEventListener('click', () => selectTimeSlot(orario, slot));
            slot.title = 'Clicca per selezionare orario inizio/fine';
            console.log('✅ Slot disponibile creato:', orario);
        } else {
            // Aggiungi la classe appropriata per lo stato non disponibile
            slot.classList.add(availability.class);
            
            // NON aggiungere event listener per slot non disponibili
            slot.style.cursor = 'not-allowed';
            
            // Imposta il tooltip appropriato
            switch (availability.reason) {
                case 'expired':
                    slot.title = 'Data scaduta';
                    break;
                case 'past-time':
                    slot.title = 'Orario già passato';
                    break;
                case 'occupied':
                    slot.title = 'Orario già prenotato';
                    console.log('🚫 Slot occupato creato:', orario, 'classe:', availability.class);
                    break;
                case 'booked':
                    slot.title = 'Orario già pagato';
                    console.log('🚫 Slot prenotato creato:', orario, 'classe:', availability.class);
                    break;
                default:
                    slot.title = 'Orario non disponibile';
            }
            
            console.log('❌ Slot non disponibile creato:', orario, 'stato:', availability.reason, 'classe:', availability.class);
        }

        timeSlotsContainer.appendChild(slot);
    }

    if (orariApertura.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="text-muted">Nessun orario disponibile per questa data</p>';
    }
}

// Verifica disponibilità di un orario specifico
async function checkTimeAvailability(orario, disponibilita) {
    console.log('🔍 checkTimeAvailability chiamato per:', orario);
    
    const now = new Date();
    const selectedDate = selectedDateInizio;

    // Crea la data completa per l'orario selezionato
    const [hour] = orario.split(':');
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(parseInt(hour), 0, 0, 0);

    // Se la data è passata, lo slot è scaduto
    if (selectedDate < now.toDateString()) {
        return { available: false, reason: 'expired', class: 'expired' };
    }

    // Se è oggi e l'orario è passato, lo slot è scaduto
    if (selectedDate.toDateString() === now.toDateString() && slotDateTime < now) {
        return { available: false, reason: 'past-time', class: 'past-time' };
    }

    // Verifica disponibilità contro prenotazioni esistenti
    // TEMPORANEO: Per ora tutti gli orari futuri sono disponibili
    // In futuro si implementerà la verifica contro le API

        // LOGICA SLOT OCCUPATI E PRENOTATI
    // Simula prenotazioni esistenti per test
    const testBookings = [
        { start: '08:00', end: '14:00', status: 'occupied' }, // Prenotazione dalle 8 alle 14
        { start: '16:00', end: '18:00', status: 'booked' }   // Prenotazione dalle 16 alle 18
    ];
    
    console.log('📋 Verifico prenotazioni per orario:', orario);
    console.log('📋 Prenotazioni di test:', testBookings);
    
    // Verifica se l'orario è incluso in una prenotazione esistente
    for (const booking of testBookings) {
        console.log('🔍 Controllo prenotazione:', booking.start, '-', booking.end, 'vs orario:', orario);
        if (orario >= booking.start && orario < booking.end) {
            console.log('❌ Orario', orario, 'è incluso in prenotazione:', booking.start, '-', booking.end, 'stato:', booking.status);
            return { 
                available: false, 
                reason: booking.status, 
                class: booking.status 
            };
        }
    }
    
    console.log('✅ Orario', orario, 'è disponibile');

    // Se non è occupato e non è prenotato, è disponibile
    return { available: true, reason: 'available', class: 'available' };
}

// Funzione per bloccare gli slot intermedi quando si seleziona un intervallo
function blockIntermediateSlots(startTime, endTime) {
    console.log('🔒 Blocco slot intermedi:', { startTime, endTime });

    // Trova tutti gli slot nell'intervallo selezionato
    const timeSlots = document.querySelectorAll('.time-slot');

    timeSlots.forEach(slot => {
        const slotTime = slot.textContent.trim();

        // Se lo slot è nell'intervallo selezionato, bloccalo
        if (slotTime >= startTime && slotTime < endTime) {
            // Non rimuovere la classe 'selected' dagli slot estremi
            if (slotTime !== startTime && slotTime !== endTime) {
                slot.classList.remove('selected');
                slot.classList.add('occupied');
                slot.style.cursor = 'not-allowed';
                console.log('🚫 Slot bloccato:', slotTime);
            }
        }
    });
}

// Seleziona uno slot temporale
function selectTimeSlot(orario, slotElement) {
    console.log('🎯 selectTimeSlot chiamata:', { orario, slotElement, classList: slotElement.classList.toString() });

    // Se è già selezionato, lo deseleziona
    if (slotElement.classList.contains('selected')) {
        console.log('🔄 Deseleziono slot:', orario);
        slotElement.classList.remove('selected');
        selectedTimeInizio = null;
        selectedTimeFine = null;

        // Rimuovi tutti i blocchi e ripristina gli slot
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected', 'occupied');
            slot.style.cursor = 'pointer';
        });

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
        console.log('🎨 Slot selezionato, classi:', slotElement.classList.toString());

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

        // Blocca gli slot intermedi
        blockIntermediateSlots(selectedTimeInizio, selectedTimeFine);

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
        document.getElementById('summaryPrezzo').textContent = `€${prezzoTotale}`;

        // Abilita il pulsante prenota
        document.getElementById('btnBook').disabled = false;
    }
}

// Mostra il riepilogo
function showSummary() {
    document.getElementById('summaryCard').classList.remove('hidden');
}

// Nascondi il riepilogo
function hideSummary() {
    document.getElementById('summaryCard').classList.add('hidden');
    document.getElementById('btnBook').disabled = true;

    // Rimuovi messaggi di selezione orario
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (timeSlotsContainer) {
        timeSlotsContainer.querySelectorAll('.alert').forEach(alert => alert.remove());
    }

    // Ripristina tutti gli slot quando si nasconde il riepilogo
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected', 'occupied');
        slot.style.cursor = 'pointer';
    });
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
async function proceedToBooking() {
    console.log('🚀 FUNZIONE PROCEEDTOBOOKING CHIAMATA!');

    try {
        console.log('🚀 Procedo alla prenotazione...');

        // Controlla se l'utente è loggato
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        console.log('🔍 Debug autenticazione:', {
            user: user ? 'presente' : 'mancante',
            token: token ? 'presente' : 'mancante',
            userContent: user ? JSON.parse(user) : null
        });

        // Log più dettagliati per debug
        console.log('🔍 Valori localStorage grezzi:');
        console.log('  - user (tipo):', typeof user, 'valore:', user);
        console.log('  - token (tipo):', typeof token, 'valore:', token);
        console.log('  - user === null:', user === null);
        console.log('  - user === "":', user === "");
        console.log('  - token === null:', token === null);
        console.log('  - token === "":', token === "");

        if (!user || !token) {
            console.log('🔐 Utente non loggato, reindirizzamento al login...');
            console.log('  - !user:', !user);
            console.log('  - !token:', !token);

            // Se l'utente è presente ma manca il token, potrebbe essere un bug
            if (user && !token) {
                console.log('⚠️ PROBLEMA RILEVATO: User presente ma token mancante!');
                console.log('🔍 Dettagli user:', user);

                try {
                    const userData = JSON.parse(user);
                    if (userData.message === 'Login effettuato') {
                        console.log('🚨 ERRORE: Utente ha messaggio di login ma token mancante');
                        console.log('💡 Possibili cause:');
                        console.log('   1. Bug nel backend (token non generato)');
                        console.log('   2. Bug nel frontend (token non salvato)');
                        console.log('   3. Problema di localStorage');

                        // Mostra errore all'utente
                        showError('Errore di autenticazione: token mancante. Effettua nuovamente il login.');

                        // Usa la funzione centralizzata per forzare il re-login
                        if (typeof window.forceReLogin === 'function') {
                            setTimeout(() => {
                                window.forceReLogin('Token di autenticazione mancante');
                            }, 2000);
                        } else {
                            // Fallback se la funzione non è disponibile
                            setTimeout(() => {
                                localStorage.removeItem('user');
                                localStorage.removeItem('token');
                                window.location.href = 'login.html?message=' + encodeURIComponent('Errore di autenticazione. Effettua nuovamente il login.');
                            }, 2000);
                        }
                        return;
                    }
                } catch (error) {
                    console.error('❌ Errore parsing user:', error);
                }
            }

            // Salva i dati della prenotazione per il redirect post-login
            const prenotazioneData = {
                sede: selectedSede.id_sede,
                spazio: selectedSpazio.id_spazio,
                dataInizio: selectedDateInizio.toISOString().split('T')[0],
                dataFine: selectedDateFine.toISOString().split('T')[0],
                orarioInizio: selectedTimeInizio,
                orarioFine: selectedTimeFine,
                prezzo: selectedSpazio.prezzo_ora || 10,
                timestamp: Date.now() // Aggiungi timestamp per pulizia automatica
            };

            localStorage.setItem('pendingPrenotazione', JSON.stringify(prenotazioneData));
            localStorage.setItem('redirectAfterLogin', window.location.href);

            // Reindirizza al login
            window.location.href = 'login.html?redirect=selezione-slot';
            return;
        }

        // Utente loggato, procede al pagamento
        console.log('✅ Utente loggato, procedo al pagamento...');

        // VERIFICA FINALE: Controlla che gli slot siano ancora disponibili
        console.log('🔍 Verifica finale disponibilità slot...');

        // TEMPORANEO: Per ora salta la verifica finale
        // TODO: Implementare quando le API saranno disponibili
        console.log('✅ Verifica finale saltata (API non ancora implementate)');

        // Prepara i parametri per la pagina di pagamento
        const params = new URLSearchParams({
            sede: selectedSede.id_sede,
            spazio: selectedSpazio.id_spazio,
            dal: selectedDateInizio.toISOString().split('T')[0],
            al: selectedDateFine.toISOString().split('T')[0],
            orarioInizio: selectedTimeInizio,
            orarioFine: selectedTimeFine
        });

        console.log('📋 Parametri URL per pagamento:', params.toString());

        // Reindirizza alla pagina di pagamento
        window.location.href = `pagamento.html?${params.toString()}`;

    } catch (error) {
        console.error('❌ Errore durante il reindirizzamento:', error);
        showError('Errore durante il reindirizzamento: ' + error.message);
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

// Verifica se uno slot è occupato (prenotato ma non pagato)
// TEMPORANEO: Per ora restituisce sempre false
async function checkSlotOccupancy(selectedDate, orario) {
    // TODO: Implementare quando le API saranno disponibili
    return false;
}

// Verifica se uno slot è già prenotato e pagato
// TEMPORANEO: Per ora restituisce sempre false
async function checkSlotBooked(selectedDate, orario) {
    // TODO: Implementare quando le API saranno disponibili
    return false;
}

// Aggiorna automaticamente gli slot scaduti
async function updateExpiredSlots() {
    if (!selectedSede || !selectedSpazio || !selectedDateInizio || !selectedDateFine) {
        return;
    }

    // TEMPORANEO: Per ora salta l'aggiornamento automatico
    // TODO: Implementare quando le API saranno disponibili
    console.log('🔄 Aggiornamento automatico slot saltato (API non ancora implementate)');
}

// Avvia l'aggiornamento automatico degli slot ogni minuto
function startAutoUpdate() {
    setInterval(updateExpiredSlots, 60000); // Aggiorna ogni minuto
}

// Converte il motivo di non disponibilità in testo leggibile
function getReasonText(reason) {
    switch (reason) {
        case 'expired':
            return 'Data scaduta';
        case 'past-time':
            return 'Orario già passato';
        case 'occupied':
            return 'Orario già prenotato';
        case 'booked':
            return 'Orario già pagato';
        case 'error':
            return 'Errore di verifica';
        default:
            return 'Non disponibile';
    }
}
