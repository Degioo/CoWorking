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

// Sistema di gestione slot real-time
let slotManager = {
    slots: new Map(), // Mappa degli slot con stato
    updateInterval: null,
    lastUpdate: null,

    // Inizializza il manager
    init() {
        console.log('🚀 Inizializzazione Slot Manager');
        this.startAutoUpdate();
    },

    // Aggiorna tutti gli slot
    async updateAllSlots() {
        try {
            console.log('🔄 Aggiornamento slot in corso...');

            // Recupera prenotazioni esistenti per lo spazio e data selezionati
            const response = await fetch(`${window.CONFIG.API_BASE}/prenotazioni/spazio/${selectedSpazio.id_spazio}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const prenotazioni = await response.json();
                console.log('📋 Prenotazioni esistenti:', prenotazioni);

                // Aggiorna stato slot basato su prenotazioni reali
                this.updateSlotsFromBookings(prenotazioni);
            } else {
                console.log('⚠️ Impossibile recuperare prenotazioni, uso stato locale');
                this.updateSlotsFromLocalState();
            }

            this.lastUpdate = Date.now();
            this.updateLastUpdateDisplay();
            console.log('✅ Aggiornamento slot completato');

        } catch (error) {
            console.error('❌ Errore aggiornamento slot:', error);
            this.updateSlotsFromLocalState();
        }
    },

    // Aggiorna slot basato su prenotazioni reali
    updateSlotsFromBookings(prenotazioni) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Reset tutti gli slot
        document.querySelectorAll('.time-slot').forEach(slot => {
            const orario = slot.textContent.trim();
            const slotDate = new Date(selectedDateInizio);
            slotDate.setHours(parseInt(orario.split(':')[0]), 0, 0, 0);

            // Determina stato slot
            let stato = 'available';
            let motivo = '';

            // Controlla se è passato
            if (slotDate < now) {
                stato = 'past-time';
                motivo = 'Orario passato';
            } else {
                // Controlla prenotazioni esistenti
                for (const prenotazione of prenotazioni) {
                    const dataInizio = new Date(prenotazione.data_inizio);
                    const dataFine = new Date(prenotazione.data_fine);

                    if (slotDate >= dataInizio && slotDate < dataFine) {
                        stato = prenotazione.stato === 'confermata' ? 'booked' : 'occupied';
                        motivo = prenotazione.stato === 'confermata' ? 'Prenotato' : 'In prenotazione';
                        break;
                    }
                }
            }

            // Controlla se lo stato è cambiato per le notifiche
            const statoPrecedente = this.slots.get(orario)?.stato;
            const statoCambiato = statoPrecedente && statoPrecedente !== stato;

            // Aggiorna slot
            this.updateSlotState(slot, orario, stato, motivo);

            // Mostra notifiche per cambiamenti di stato
            if (statoCambiato) {
                if (stato === 'available' && statoPrecedente !== 'available') {
                    notificationSystem.notifySlotAvailable(orario);
                } else if (stato === 'occupied' && statoPrecedente !== 'occupied') {
                    notificationSystem.notifySlotOccupied(orario);
                } else if (stato === 'past-time' && statoPrecedente !== 'past-time') {
                    notificationSystem.notifySlotExpired(orario);
                }
            }
        });
    },

    // Aggiorna slot basato su stato locale (fallback)
    updateSlotsFromLocalState() {
        const now = new Date();

        document.querySelectorAll('.time-slot').forEach(slot => {
            const orario = slot.textContent.trim();
            const slotDate = new Date(selectedDateInizio);
            slotDate.setHours(parseInt(orario.split(':')[0]), 0, 0, 0);

            let stato = 'available';
            let motivo = '';

            if (slotDate < now) {
                stato = 'past-time';
                motivo = 'Orario passato';
            }

            this.updateSlotState(slot, orario, stato, motivo);
        });
    },

    // Aggiorna stato di un singolo slot
    updateSlotState(slot, orario, stato, motivo) {
        // Rimuovi classi precedenti
        slot.classList.remove('available', 'occupied', 'booked', 'past-time', 'expired', 'selected');
        
        // Aggiungi nuova classe
        slot.classList.add(stato);
        
        // Rimuovi stili inline per permettere al CSS di funzionare
        slot.style.removeProperty('background-color');
        slot.style.removeProperty('color');
        slot.style.removeProperty('border-color');
        slot.style.removeProperty('cursor');
        slot.style.removeProperty('opacity');
        slot.style.removeProperty('animation');
        slot.style.removeProperty('box-shadow');
        
        // Aggiorna stile e comportamento
        switch (stato) {
            case 'available':
                slot.style.cursor = 'pointer';
                slot.title = 'Disponibile';
                break;
            case 'selected':
                slot.style.cursor = 'pointer';
                slot.title = 'Selezionato';
                break;
            case 'occupied':
                slot.style.cursor = 'not-allowed';
                slot.title = `Occupato: ${motivo}`;
                break;
            case 'booked':
                slot.style.cursor = 'not-allowed';
                slot.title = `Prenotato: ${motivo}`;
                break;
            case 'past-time':
                slot.style.cursor = 'not-allowed';
                slot.title = `Orario passato`;
                break;
        }
        
        // Aggiorna mappa locale
        this.slots.set(orario, { stato, motivo, timestamp: Date.now() });
    },

    // Avvia aggiornamento automatico
    startAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Aggiorna ogni 30 secondi
        this.updateInterval = setInterval(() => {
            this.updateAllSlots();
        }, 30000);

        // Primo aggiornamento immediato
        this.updateAllSlots();

        console.log('⏰ Aggiornamento automatico slot avviato (30s)');
    },

    // Ferma aggiornamento automatico
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏹️ Aggiornamento automatico slot fermato');
        }
    },

    // Aggiorna display ultimo aggiornamento
    updateLastUpdateDisplay() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement && this.lastUpdate) {
            const now = new Date();
            const diff = Math.floor((now - this.lastUpdate) / 1000);

            if (diff < 60) {
                lastUpdateElement.textContent = `Ultimo aggiornamento: ${diff}s fa`;
            } else if (diff < 3600) {
                const minutes = Math.floor(diff / 60);
                lastUpdateElement.textContent = `Ultimo aggiornamento: ${minutes}m fa`;
            } else {
                const hours = Math.floor(diff / 3600);
                lastUpdateElement.textContent = `Ultimo aggiornamento: ${hours}h fa`;
            }
        }
    },

    // Verifica disponibilità per un intervallo specifico
    async checkAvailability(startTime, endTime) {
        try {
            // Costruisci le date complete per l'intervallo selezionato
            const dataInizio = new Date(selectedDateInizio);
            const dataFine = new Date(selectedDateFine);

            // Imposta gli orari specifici
            const [oraInizio] = startTime.split(':');
            const [oraFine] = endTime.split(':');

            dataInizio.setHours(parseInt(oraInizio), 0, 0, 0);
            dataFine.setHours(parseInt(oraFine), 0, 0, 0);

            const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${selectedSpazio.id_spazio}/disponibilita?data_inizio=${dataInizio.toISOString()}&data_fine=${dataFine.toISOString()}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Verifica disponibilità:', result);
                return result.disponibile;
            }

            console.log('⚠️ Errore verifica disponibilità:', response.status);
            return false;
        } catch (error) {
            console.error('❌ Errore verifica disponibilità:', error);
            return false;
        }
    }
};

// Sistema di notifiche real-time
let notificationSystem = {
    container: null,

    init() {
        this.createNotificationContainer();
        console.log('🔔 Sistema notifiche inizializzato');
    },

    createNotificationContainer() {
        // Crea container per notifiche se non esiste
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? 'var(--success)' : type === 'warning' ? 'var(--warning)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
            color: white;
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            cursor: pointer;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
            </div>
        `;

        this.container.appendChild(notification);

        // Anima l'entrata
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Rimuovi automaticamente
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);

        return notification;
    },

    // Notifica quando uno slot diventa disponibile
    notifySlotAvailable(orario) {
        this.show(`🎉 Slot ${orario} è ora disponibile!`, 'success');
    },

    // Notifica quando uno slot viene occupato
    notifySlotOccupied(orario) {
        this.show(`🚫 Slot ${orario} è stato occupato`, 'warning');
    },

    // Notifica quando uno slot scade
    notifySlotExpired(orario) {
        this.show(`⏰ Slot ${orario} è scaduto`, 'info');
    }
};

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

        // Inizializza il sistema di gestione slot real-time
        slotManager.init();
        notificationSystem.init(); // Inizializza il sistema di notifiche

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
                    console.log('✅ Sede e spazio selezionati, chiamo loadOrariDisponibili');
                    loadOrariDisponibili();
                } else {
                    console.log('⚠️ Sede o spazio non selezionati, non posso caricare orari');
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
    console.log('🔄 loadOrariDisponibili chiamata');
    console.log('📍 Stato selezione:', {
        sede: selectedSede,
        spazio: selectedSpazio,
        dataInizio: selectedDateInizio,
        dataFine: selectedDateFine
    });

    if (!selectedSede || !selectedSpazio || !selectedDateInizio || !selectedDateFine) {
        console.log('❌ Selezione incompleta, esco da loadOrariDisponibili');
        return;
    }

    try {
        console.log(`🔄 Caricamento orari disponibili dal ${selectedDateInizio.toLocaleDateString('it-IT')} al ${selectedDateFine.toLocaleDateString('it-IT')}...`);

        // Per ora, carica tutti gli orari disponibili senza verificare conflitti specifici
        // In futuro si può implementare una verifica più sofisticata
        console.log('📅 Caricamento orari per l\'intervallo selezionato');

        // Simula una risposta di disponibilità (per ora tutti disponibili)
        const disponibilita = { disponibile: true, orari: [] };

        console.log('✅ Chiamo displayTimeSlots con:', disponibilita);
        // Mostra gli orari disponibili
        await displayTimeSlots(disponibilita);

    } catch (error) {
        console.error('❌ Errore caricamento orari:', error);
        showError('Errore caricamento orari: ' + error.message);
    }
}

// Mostra gli slot temporali disponibili
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
    for (const orario of orariApertura) {
        console.log('🔨 Creo slot per orario:', orario);

        const slot = document.createElement('div');
        slot.className = 'time-slot available';
        slot.textContent = orario;
        slot.dataset.orario = orario;

        // Aggiungi event listener per tutti gli slot
        slot.addEventListener('click', () => selectTimeSlot(orario, slot));
        slot.title = 'Clicca per selezionare orario inizio/fine';

        // Applica solo la classe CSS per compatibilità
        slot.classList.add('time-slot', 'available');
        
        // Rimuovi tutti gli stili inline per permettere al CSS di funzionare
        slot.style.removeProperty('background-color');
        slot.style.removeProperty('color');
        slot.style.removeProperty('cursor');
        slot.style.removeProperty('border');
        slot.style.removeProperty('border-radius');
        slot.style.removeProperty('padding');
        slot.style.removeProperty('margin');
        slot.style.removeProperty('display');
        slot.style.removeProperty('min-width');
        slot.style.removeProperty('text-align');
        slot.style.removeProperty('transition');
        slot.style.removeProperty('box-shadow');
        slot.style.removeProperty('position');
        slot.style.removeProperty('z-index');
        slot.style.removeProperty('opacity');
        slot.style.removeProperty('visibility');
        slot.style.removeProperty('overflow');

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
    console.log('🎯 Container HTML:', timeSlotsContainer.innerHTML.substring(0, 200) + '...');

    // Verifica che gli slot siano visibili
    const createdSlots = timeSlotsContainer.querySelectorAll('.time-slot');
    console.log('🔍 Slot creati e trovati nel DOM:', createdSlots.length);
    createdSlots.forEach((slot, index) => {
        console.log(`🔍 Slot ${index + 1}:`, {
            text: slot.textContent,
            visible: slot.offsetParent !== null,
            display: window.getComputedStyle(slot).display,
            backgroundColor: window.getComputedStyle(slot).backgroundColor
        });
    });

    // COMMENTO TEMPORANEAMENTE - Il slotManager sta causando problemi
    // await slotManager.updateAllSlots();

    // Riabilito il slotManager ora che le API sono disponibili
    await slotManager.updateAllSlots();

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

    // Usa il sistema di gestione slot real-time
    const slot = slotManager.slots.get(orario);

    if (slot) {
        console.log('📋 Stato slot da cache:', slot);
        return {
            available: slot.stato === 'available',
            reason: slot.motivo,
            class: slot.stato
        };
    }

    // Se non è in cache, è disponibile (verrà aggiornato dal manager)
    console.log('✅ Orario', orario, 'non in cache, considerato disponibile');
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
                // Rimuovi stili inline per permettere al CSS di funzionare
                slot.style.removeProperty('cursor');
                console.log('🚫 Slot bloccato:', slotTime);
            }
        }
    });
}

// Seleziona uno slot temporale
async function selectTimeSlot(orario, slotElement) {
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
            // Rimuovi stili inline per permettere al CSS di funzionare
            slot.style.removeProperty('cursor');
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

        // VERIFICA DISPONIBILITÀ FINALE PRIMA DI ABILITARE IL BOTTONE
        console.log('🔍 Verifica disponibilità finale prima di abilitare il bottone...');
        const disponibile = await slotManager.checkAvailability(selectedTimeInizio, selectedTimeFine);

        if (!disponibile) {
            // Slot non disponibile, disabilita il bottone e mostra errore
            document.getElementById('btnBook').disabled = true;
            // Rimuovi stili inline per permettere al CSS di funzionare
            document.getElementById('btnBook').classList.remove('btn-danger');
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

// Verifica disponibilità finale prima di abilitare il bottone
async function verificaDisponibilitaFinale() {
    console.log('🔍 Verifica disponibilità finale per slot selezionati...');

    try {
        // Recupera disponibilità per lo spazio e data selezionati
        const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${selectedSpazio.id_spazio}/disponibilita`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const disponibilita = await response.json();
            console.log('📋 Disponibilità per lo spazio:', disponibilita);

            // Verifica se lo spazio è disponibile per la data e orario selezionati
            if (disponibilita.disponibile === false) {
                console.log('🚫 Spazio non disponibile:', disponibilita.motivo);
                return {
                    disponibile: false,
                    motivo: disponibilita.motivo || 'Spazio non disponibile per l\'orario selezionato'
                };
            }

            console.log('✅ Spazio disponibile per l\'orario selezionato');
            return { disponibile: true };
        } else {
            console.log('⚠️ Impossibile verificare disponibilità spazio');
            return { disponibile: true }; // Procedi se non puoi verificare
        }
    } catch (error) {
        console.log('⚠️ Errore verifica disponibilità finale:', error.message);
        return { disponibile: true }; // Procedi se c'è un errore
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
        document.getElementById('btnBook').textContent = 'Prenota Ora';
        // Rimuovi eventuali classi di errore
        document.getElementById('btnBook').classList.remove('btn-danger');
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
        // Rimuovi stili inline per permettere al CSS di funzionare
        slot.style.removeProperty('cursor');
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
