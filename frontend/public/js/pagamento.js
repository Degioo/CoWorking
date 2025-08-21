// Configurazione API
// Configurazione API - usa quella globale da config.js

// Configurazione Stripe
let stripe;
let elements;
let card;
let paymentIntentId;

// Dati della prenotazione
let prenotazioneData = {};

// Funzione per ottenere i dati della prenotazione
function getPrenotazioneData() {
    return window.prenotazioneData || prenotazioneData;
}

// Flag per tracciare se il pagamento è stato completato
let pagamentoCompletato = false;

// Variabili per il countdown di scadenza slot
let countdownInterval = null;
let scadenzaSlot = null;

// Gestisce il countdown dello slot
function startSlotCountdown(prenotazioneId, scadenzaTimestamp) {
    scadenzaSlot = new Date(scadenzaTimestamp);

    console.log(`🕒 Avvio countdown slot per prenotazione ${prenotazioneId}, scadenza: ${scadenzaSlot}`);

    // Crea l'elemento di countdown se non esiste
    createCountdownElement();

    // Avvia il countdown
    updateCountdownDisplay();
    countdownInterval = setInterval(updateCountdownDisplay, 1000);
}

// Crea l'elemento visuale per il countdown
function createCountdownElement() {
    // Rimuovi countdown esistente se presente
    const existingCountdown = document.getElementById('slot-countdown');
    if (existingCountdown) {
        existingCountdown.remove();
    }

    // Crea nuovo elemento countdown
    const countdownElement = document.createElement('div');
    countdownElement.id = 'slot-countdown';
    countdownElement.className = 'alert alert-warning mt-3';
    countdownElement.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-clock text-warning me-2"></i>
            <div>
                <strong>⏰ Tempo rimanente per completare il pagamento:</strong>
                <div id="countdown-display" class="fs-4 fw-bold text-danger mt-1">15:00</div>
            </div>
        </div>
    `;

    // Inserisci dopo l'elemento dei dettagli della prenotazione
    const paymentDetails = document.querySelector('.payment-details');
    if (paymentDetails) {
        paymentDetails.parentNode.insertBefore(countdownElement, paymentDetails.nextSibling);
    }
}

// Aggiorna il display del countdown
function updateCountdownDisplay() {
    if (!scadenzaSlot) return;

    const now = new Date();
    const diff = scadenzaSlot - now;

    const countdownDisplay = document.getElementById('countdown-display');

    if (diff <= 0) {
        // Tempo scaduto
        clearInterval(countdownInterval);
        countdownInterval = null;

        if (countdownDisplay) {
            countdownDisplay.innerHTML = '<span class="text-danger">⏰ TEMPO SCADUTO</span>';
        }

        // Mostra messaggio di scadenza
        showError('⏰ Tempo scaduto! La prenotazione è stata annullata automaticamente.');

        // Disabilita il form di pagamento
        disablePaymentForm();

        // Reindirizza alla dashboard dopo 5 secondi
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 5000);

        return;
    }

    // Calcola minuti e secondi rimanenti
    const minutiRimanenti = Math.floor(diff / (1000 * 60));
    const secondiRimanenti = Math.floor((diff % (1000 * 60)) / 1000);

    if (countdownDisplay) {
        const timeString = `${minutiRimanenti}:${secondiRimanenti.toString().padStart(2, '0')}`;

        // Cambia colore in base al tempo rimanente
        let colorClass = 'text-warning';
        if (minutiRimanenti <= 2) {
            colorClass = 'text-danger';
        } else if (minutiRimanenti <= 5) {
            colorClass = 'text-warning';
        }

        countdownDisplay.innerHTML = `<span class="${colorClass}">${timeString}</span>`;
    }
}

// Disabilita il form di pagamento
function disablePaymentForm() {
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        // Disabilita tutti gli input e button nel form
        const inputs = paymentForm.querySelectorAll('input, button, select, textarea');
        inputs.forEach(input => {
            input.disabled = true;
        });

        // Aggiungi overlay al form
        paymentForm.style.opacity = '0.5';
        paymentForm.style.pointerEvents = 'none';
    }
}

// Ferma il countdown (quando il pagamento è completato)
function stopSlotCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // Rimuovi l'elemento countdown
    const countdownElement = document.getElementById('slot-countdown');
    if (countdownElement) {
        countdownElement.remove();
    }

    console.log('🏁 Countdown slot fermato');
}

// Gestione interruzione pagamento
window.addEventListener('beforeunload', function (e) {
    // Ferma il countdown se attivo
    stopSlotCountdown();

    // Solo se il pagamento non è stato completato e c'è una prenotazione
    if (!pagamentoCompletato && prenotazioneData && prenotazioneData.id_prenotazione) {
        // Metti in sospeso la prenotazione
        suspendPrenotazioneOnExit(prenotazioneData.id_prenotazione);

        // Mostra messaggio di conferma
        e.preventDefault();
        e.returnValue = 'Sei sicuro di voler uscire? Il pagamento non è stato completato.';
    }
});

// Funzione per mettere in sospeso la prenotazione quando l'utente esce
async function suspendPrenotazioneOnExit(idPrenotazione) {
    try {
        // Chiama l'API per mettere in sospeso la prenotazione
        await fetch(`${window.CONFIG.API_BASE}/prenotazioni/${idPrenotazione}/suspend`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });

        console.log('Prenotazione messa in sospeso per interruzione pagamento');
    } catch (error) {
        console.error('Errore sospensione prenotazione:', error);
    }
}

// Funzione helper per chiamate API con timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Timeout: la richiesta ha impiegato troppo tempo');
        }
        throw error;
    }
}

// Verifica connessione internet
function checkInternetConnection() {
    if (!navigator.onLine) {
        return false;
    }

    // Prova a fare una richiesta di test
    return fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-cache'
    }).then(() => true).catch(() => false);
}

// Testa la connessione Stripe
async function testStripeConnection() {
    try {
        console.log('Test connessione Stripe...');

        // Verifica che Stripe sia funzionante
        if (!stripe || !elements) {
            throw new Error('Stripe non inizializzato correttamente');
        }

        // Verifica che l'elemento carta sia stato creato
        if (!card) {
            throw new Error('Elemento carta Stripe non creato');
        }

        console.log('✅ Connessione Stripe OK');
        return true;
    } catch (error) {
        console.error('❌ Errore connessione Stripe:', error);
        throw error;
    }
}

// Verifica elementi DOM necessari
function checkRequiredElements() {
    const requiredElements = [
        'card-element',
        'sede-prenotazione',
        'spazio-prenotazione',
        'data-inizio-prenotazione',
        'data-fine-prenotazione',
        'durata-prenotazione',
        'totale-prenotazione'
    ];

    const missingElements = [];

    for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
            missingElements.push(elementId);
        }
    }

    if (missingElements.length > 0) {
        throw new Error(`Elementi DOM mancanti: ${missingElements.join(', ')}`);
    }

    return true;
}

// Verifica se l'API è raggiungibile
async function checkAPIAvailability() {
    try {
        console.log('Verifico disponibilità API...');
        const response = await fetchWithTimeout(`${window.CONFIG.API_BASE}/ping`, {}, 5000);

        if (!response.ok) {
            throw new Error(`API non disponibile: ${response.status} ${response.statusText}`);
        }

        console.log('API verificata e disponibile');
        return true;
    } catch (error) {
        console.error('Errore verifica API:', error);
        throw new Error('API non raggiungibile. Verifica la connessione o riprova più tardi.');
    }
}

// Verifica se l'utente ha i permessi per la prenotazione
async function checkPrenotazionePermissions(prenotazioneId) {
    try {
        console.log('Verifico permessi prenotazione...');

        // Recupera i dati dell'utente corrente
        const user = localStorage.getItem('user');
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        const userData = JSON.parse(user);
        console.log('Utente corrente:', userData);

        // Verifica se la prenotazione esiste e appartiene all'utente
        const response = await fetchWithTimeout(`${window.CONFIG.API_BASE}/prenotazioni/${prenotazioneId}`, {
            headers: getAuthHeaders()
        }, 10000);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Prenotazione non trovata');
            } else if (response.status === 403) {
                throw new Error('Non hai i permessi per accedere a questa prenotazione');
            } else {
                throw new Error(`Errore verifica prenotazione: ${response.status} ${response.statusText}`);
            }
        }

        const prenotazione = await response.json();
        console.log('Prenotazione trovata:', prenotazione);

        // Verifica se la prenotazione appartiene all'utente corrente
        if (prenotazione.id_utente !== userData.id_utente) {
            throw new Error('Non hai i permessi per accedere a questa prenotazione');
        }

        console.log('Permessi prenotazione verificati');
        return true;

    } catch (error) {
        console.error('Errore verifica permessi:', error);
        throw error;
    }
}

// Verifica se la prenotazione è già stata pagata
async function checkPrenotazionePaymentStatus(prenotazioneId) {
    try {
        console.log('Verifico stato pagamento prenotazione...');

        // Verifica se esiste già un pagamento per questa prenotazione
        const response = await fetchWithTimeout(`${window.CONFIG.API_BASE}/pagamenti/stripe/status/${prenotazioneId}`, {
            headers: getAuthHeaders()
        }, 10000);

        if (response.ok) {
            const paymentStatus = await response.json();
            console.log('Stato pagamento:', paymentStatus);

            if (paymentStatus.status === 'succeeded') {
                throw new Error('Questa prenotazione è già stata pagata');
            } else if (paymentStatus.status === 'processing') {
                throw new Error('Pagamento in elaborazione per questa prenotazione');
            }
        }

        console.log('Prenotazione pronta per il pagamento');
        return true;

    } catch (error) {
        if (error.message.includes('già stata pagata') || error.message.includes('in elaborazione')) {
            throw error;
        }

        // Se l'endpoint non esiste o restituisce errore, assumiamo che non ci siano pagamenti
        console.log('Nessun pagamento esistente trovato, procedo con il pagamento');
        return true;
    }
}

// Verifica se la prenotazione è ancora valida
async function checkPrenotazioneValidity(prenotazioneId) {
    try {
        console.log('Verifico validità prenotazione...');

        // Recupera i dati della prenotazione
        const response = await fetchWithTimeout(`${window.CONFIG.API_BASE}/prenotazioni/${prenotazioneId}`, {
            headers: getAuthHeaders()
        }, 10000);

        if (!response.ok) {
            throw new Error('Impossibile verificare la validità della prenotazione');
        }

        const prenotazione = await response.json();
        console.log('Dati prenotazione per validità:', prenotazione);

        // Verifica se la data di inizio è nel futuro
        const dataInizio = new Date(prenotazione.data_inizio);
        const now = new Date();

        if (dataInizio <= now) {
            throw new Error('Questa prenotazione è scaduta o già iniziata');
        }

        // Verifica se la prenotazione è stata cancellata
        if (prenotazione.stato === 'cancellata') {
            throw new Error('Questa prenotazione è stata cancellata');
        }

        console.log('Prenotazione valida');
        return true;

    } catch (error) {
        console.error('Errore verifica validità:', error);
        throw error;
    }
}

// Crea prenotazione dai parametri URL
async function createPrenotazioneFromParams(sede, spazio, dataInizio, dataFine) {
    try {
        console.log('Creo prenotazione dai parametri:', { sede, spazio, dataInizio, dataFine });

        // Verifica autenticazione
        const user = localStorage.getItem('user');
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        const userData = JSON.parse(user);

        // Crea la prenotazione
        const prenotazioneData = {
            id_utente: userData.id_utente,
            id_spazio: spazio,
            data_inizio: dataInizio,
            data_fine: dataFine
        };

        console.log('Dati prenotazione da creare:', prenotazioneData);

        const response = await fetchWithTimeout(`${window.CONFIG.API_BASE}/prenotazioni`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': userData.id_utente
            },
            body: JSON.stringify(prenotazioneData)
        }, 15000);

        if (!response.ok) {
            const error = await response.json();

            // Gestisci specificamente gli slot bloccati
            if (response.status === 409 && error.minutiRimanenti) {
                throw new Error(`Slot temporaneamente bloccato. Riprova tra ${error.minutiRimanenti} minuti.`);
            }

            throw new Error(error.error || 'Errore nella creazione della prenotazione');
        }

        const prenotazione = await response.json();
        console.log('Prenotazione creata:', prenotazione);

        // Se il backend ha bloccato lo slot, mostra le informazioni di scadenza
        if (prenotazione.slot_bloccato && prenotazione.scadenza_slot) {
            console.log(`✅ Slot bloccato fino a: ${prenotazione.scadenza_slot}`);

            // Avvia il countdown per questa prenotazione
            startSlotCountdown(prenotazione.id_prenotazione, prenotazione.scadenza_slot);
        }

        // Recupera i nomi di sede e spazio per completare i dati
        try {
            const [sedeResponse, spazioResponse] = await Promise.all([
                fetchWithTimeout(`${window.CONFIG.API_BASE}/sedi`, {}, 5000),
                fetchWithTimeout(`${window.CONFIG.API_BASE}/spazi`, {}, 5000)
            ]);

            if (sedeResponse.ok && spazioResponse.ok) {
                const sedi = await sedeResponse.json();
                const spazi = await spazioResponse.json();

                // Trova la sede e lo spazio specifici
                const sedeData = sedi.find(s => s.id_sede == sede);
                const spazioData = spazi.find(sp => sp.id_spazio == spazio);

                if (sedeData && spazioData) {
                    // Completa i dati della prenotazione con i nomi
                    prenotazione.nome_sede = sedeData.nome;
                    prenotazione.nome_spazio = spazioData.nome;
                    prenotazione.citta_sede = sedeData.citta;
                }
            }
        } catch (error) {
            console.warn('Impossibile recuperare nomi sede/spazio:', error);
        }

        // Salva i dati della prenotazione
        window.prenotazioneData = prenotazione;

        // Aggiungi le date se non sono presenti (caso creazione automatica)
        if (!prenotazione.data_inizio) {
            prenotazione.data_inizio = dataInizio;
            prenotazione.data_fine = dataFine;
        }

        // Non è più necessario mostrare la selezione del metodo di pagamento

        // Popola i dettagli della prenotazione
        await loadPrenotazioneData();

        // Inizializza Stripe
        await initializeStripe();

        // Configura gli event listener
        setupEventListeners();

    } catch (error) {
        console.error('Errore creazione prenotazione:', error);
        showError('Errore nella creazione della prenotazione: ' + error.message);
        addRetryButton();
    }
}

// Funzione principale di inizializzazione
async function initializePage(prenotazioneId) {
    // Mostra loading globale
    setGlobalLoading(true);

    try {
        // Verifica connessione internet
        console.log('Verifico connessione internet...');
        const isOnline = await checkInternetConnection();
        if (!isOnline) {
            throw new Error('Connessione internet non disponibile. Verifica la tua connessione.');
        }
        console.log('Connessione internet verificata');

        // Verifica elementi DOM
        console.log('Verifico elementi DOM...');
        checkRequiredElements();
        console.log('Elementi DOM verificati');

        // Verifica disponibilità API
        console.log('Verifico disponibilità API...');
        await checkAPIAvailability();
        console.log('API verificata');

        // Verifica permessi prenotazione
        console.log('Verifico permessi prenotazione...');
        await checkPrenotazionePermissions(prenotazioneId);
        console.log('Permessi verificati');

        // Verifica se la prenotazione è già stata pagata
        console.log('Verifico stato pagamento...');
        await checkPrenotazionePaymentStatus(prenotazioneId);
        console.log('Stato pagamento verificato');

        // Verifica se la prenotazione è ancora valida
        console.log('Verifico validità prenotazione...');
        await checkPrenotazioneValidity(prenotazioneId);
        console.log('Validità prenotazione verificata');

        // Verifica validità token all'avvio
        console.log('Verifico token...');
        await validateTokenOnStartup();
        console.log('Token verificato con successo');

        console.log('Inizializzo Stripe...');
        await initializeStripe();
        console.log('Stripe inizializzato');

        console.log('Carico dati prenotazione...');
        await loadPrenotazioneData();
        console.log('Dati prenotazione caricati');

        console.log('Configuro event listener...');
        setupEventListeners();
        console.log('Inizializzazione completata');
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);

        // Aggiungi pulsante di retry
        addRetryButton();
    } finally {
        // Nascondi loading globale
        setGlobalLoading(false);
    }
}

// Inizializza Stripe
async function initializeStripe() {
    try {
        console.log('initializeStripe - Inizio');

        // Se Stripe è già inizializzato, non reinizializzarlo
        if (stripe) {
            console.log('initializeStripe - Stripe già inizializzato, salto inizializzazione');
            return;
        }

        // Verifica se Stripe è disponibile
        if (typeof Stripe === 'undefined') {
            console.error('Stripe non è definito. Verifico se la libreria è caricata...');

            // Aspetta un po' e riprova
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (typeof Stripe === 'undefined') {
                throw new Error('Libreria Stripe non caricata. Verifica la connessione internet e ricarica la pagina.');
            }
        }

        console.log('Stripe disponibile:', typeof Stripe);
        console.log('Stripe versione:', Stripe.version);

        console.log('initializeStripe - Chiamo API config Stripe:', `${window.CONFIG.API_BASE}/pagamenti/stripe/config`);

        // Recupera la configurazione Stripe dal backend
        const response = await fetchWithTimeout(`${window.CONFIG.API_BASE}/pagamenti/stripe/config`, {}, 10000);

        console.log('initializeStripe - Risposta config ricevuta:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('initializeStripe - Errore API config:', errorText);
            throw new Error('Errore nel recupero della configurazione Stripe');
        }

        const config = await response.json();
        console.log('initializeStripe - Config ricevuta:', config);

        if (!config.publishableKey) {
            throw new Error('Chiave pubblica Stripe non configurata');
        }

        console.log('initializeStripe - Inizializzo Stripe con chiave:', config.publishableKey.substring(0, 20) + '...');

        // Inizializza Stripe
        stripe = Stripe(config.publishableKey);

        // Crea gli elementi Stripe
        elements = stripe.elements();

        // Crea l'elemento carta
        card = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#495057',
                    '::placeholder': {
                        color: '#6c757d'
                    }
                },
                invalid: {
                    color: '#dc3545'
                }
            }
        });

        // Monta l'elemento carta
        const cardElement = document.getElementById('card-element');
        if (!cardElement) {
            throw new Error('Elemento DOM per la carta non trovato');
        }

        // Pulisci l'elemento prima di montare
        cardElement.innerHTML = '';

        // Le dimensioni sono gestite dal CSS pulito

        // Monta l'elemento carta
        card.mount('#card-element');

        // Verifica che l'elemento sia stato montato correttamente
        setTimeout(() => {
            const stripeInputs = cardElement.querySelectorAll('input');
            if (stripeInputs.length === 0) {
                console.error('Stripe Elements non montato correttamente');

                // Mostra messaggio di errore all'utente
                const cardErrors = document.getElementById('card-errors');
                if (cardErrors) {
                    cardErrors.textContent = 'Errore nel caricamento del form di pagamento. Ricarica la pagina.';
                    cardErrors.style.display = 'block';
                }

                throw new Error('Errore nel montaggio di Stripe Elements');
            }
            console.log('Stripe Elements montato correttamente con', stripeInputs.length, 'input');

            // Nascondi eventuali errori precedenti
            const cardErrors = document.getElementById('card-errors');
            if (cardErrors) {
                cardErrors.textContent = '';
                cardErrors.style.display = 'none';
            }

            // Verifica che gli input siano visibili e funzionali
            stripeInputs.forEach((input, index) => {
                console.log(`Input ${index}:`, {
                    type: input.type,
                    visible: input.offsetWidth > 0 && input.offsetHeight > 0,
                    color: window.getComputedStyle(input).color,
                    background: window.getComputedStyle(input).background
                });
            });
        }, 1000);

        // Gestisci gli eventi della carta
        card.on('change', function (event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
                displayError.style.display = 'block';
                document.getElementById('card-element').classList.add('invalid');
            } else {
                displayError.textContent = '';
                displayError.style.display = 'none';
                document.getElementById('card-element').classList.remove('invalid');
            }
        });

        console.log('initializeStripe - Stripe inizializzato con successo');

        // Testa la connessione Stripe
        await testStripeConnection();

        // Stripe Elements è ora configurato correttamente tramite CSS
        // Non serve più manipolare gli elementi JavaScript
    } catch (error) {
        console.error('Errore inizializzazione Stripe:', error);
        showError('Errore configurazione pagamento: ' + error.message);
        throw error; // Rilancia l'errore per gestirlo nel chiamante
    }
}

// Carica i dati della prenotazione
async function loadPrenotazioneData() {
    try {
        console.log('loadPrenotazioneData - Inizio funzione');

        // Se abbiamo già i dati della prenotazione (caso creazione automatica)
        if (window.prenotazioneData && window.prenotazioneData.id_prenotazione) {
            console.log('loadPrenotazioneData - Usa dati prenotazione già caricati:', window.prenotazioneData);
            prenotazioneData = window.prenotazioneData;
            populatePrenotazioneDetails();
            return;
        }

        // Altrimenti cerca l'ID della prenotazione nell'URL (flusso normale)
        const urlParams = new URLSearchParams(window.location.search);
        const prenotazioneId = urlParams.get('id_prenotazione');

        console.log('loadPrenotazioneData - ID prenotazione dall\'URL:', prenotazioneId);

        if (!prenotazioneId) {
            throw new Error('ID prenotazione non specificato');
        }

        console.log('loadPrenotazioneData - Chiamo API:', `${window.CONFIG.API_BASE}/prenotazioni/${prenotazioneId}`);

        // Recupera i dati della prenotazione
        const response = await fetchWithTimeout(`${window.CONFIG.API_BASE}/prenotazioni/${prenotazioneId}`, {
            headers: getAuthHeaders()
        }, 15000);

        console.log('loadPrenotazioneData - Risposta API ricevuta:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('loadPrenotazioneData - Errore API:', errorText);
            throw new Error(`Errore nel recupero della prenotazione: ${response.status} ${response.statusText}`);
        }

        prenotazioneData = await response.json();
        console.log('loadPrenotazioneData - Dati ricevuti:', prenotazioneData);

        // Popola i dettagli della prenotazione
        populatePrenotazioneDetails();
        console.log('loadPrenotazioneData - Completato con successo');

    } catch (error) {
        console.error('Errore caricamento prenotazione:', error);
        showError('Errore nel caricamento dei dati della prenotazione: ' + error.message);

        // Mostra un messaggio più specifico all'utente
        document.getElementById('data-inizio-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('data-fine-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('durata-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('sede-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('spazio-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('totale-prenotazione').textContent = 'Errore caricamento';
    }
}

// Popola i dettagli della prenotazione
function populatePrenotazioneDetails() {
    const data = getPrenotazioneData();
    if (!data) return;

    console.log('populatePrenotazioneDetails - Dati prenotazione:', data);

    const dataInizio = new Date(data.data_inizio);
    const dataFine = new Date(data.data_fine);

    // Calcola la durata
    const durataMs = dataFine - dataInizio;
    const durataOre = Math.round(durataMs / (1000 * 60 * 60));

    // Calcola l'importo (10€/ora)
    const importo = durataOre * 10;

    // Formatta la data
    const dataFormattata = dataInizio.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Formatta l'orario
    const orarioInizio = dataInizio.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const orarioFine = dataFine.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Aggiorna l'interfaccia
    document.getElementById('data-inizio-prenotazione').textContent = dataFormattata;
    document.getElementById('data-fine-prenotazione').textContent = dataFine.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('durata-prenotazione').textContent = `${durataOre} ore`;

    // Gestisci il nome dello spazio e della sede
    let sedeText = 'Sede selezionata';
    let spazioText = 'Spazio selezionato';

    if (data.nome_sede) {
        sedeText = data.nome_sede;
    } else if (data.id_sede) {
        sedeText = `Sede #${data.id_sede}`;
    }

    if (data.nome_spazio) {
        spazioText = data.nome_spazio;
    } else if (data.id_spazio) {
        spazioText = `Spazio #${data.id_spazio}`;
    }

    document.getElementById('sede-prenotazione').textContent = sedeText;
    document.getElementById('spazio-prenotazione').textContent = spazioText;
    document.getElementById('totale-prenotazione').textContent = `€${importo.toFixed(2)}`;

    // Salva l'importo per il pagamento
    data.importo = importo;

    console.log('populatePrenotazioneDetails - Importo calcolato:', importo);
}

// Configura gli event listener
function setupEventListeners() {
    // Event listener per il form di pagamento Stripe
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handleStripePaymentSubmit);
    }
}

// Gestisce l'invio del form di pagamento Stripe
async function handleStripePaymentSubmit(event) {
    event.preventDefault();

    console.log('handleStripePaymentSubmit - Inizio gestione pagamento Stripe');

    // Verifica che Stripe sia inizializzato
    if (!stripe) {
        console.error('Stripe non inizializzato');
        showError('Errore di configurazione pagamento. Ricarica la pagina.');
        return;
    }

    // Disabilita il pulsante di pagamento
    const payButton = document.getElementById('pay-button');
    payButton.disabled = true;
    payButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Elaborazione...';

    try {
        // Crea l'intent di pagamento
        const paymentIntent = await createPaymentIntent();
        console.log('Payment Intent creato:', paymentIntent);

        // Conferma il pagamento con Stripe passando i dati della carta
        const { error, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
            payment_method: {
                card: card
            }
        });

        if (error) {
            console.error('Errore conferma pagamento:', error);
            showError('Errore durante il pagamento: ' + error.message);
        } else {
            console.log('Pagamento confermato:', confirmedIntent);
            await handlePaymentSuccess(confirmedIntent, 'stripe');
        }

    } catch (error) {
        console.error('Errore pagamento Stripe:', error);
        showError('Errore durante il pagamento: ' + error.message);
    } finally {
        // Riabilita il pulsante di pagamento
        payButton.disabled = false;
        payButton.innerHTML = '<i class="fas fa-lock me-2"></i>Paga in Sicurezza';
    }
}

// Funzione rimossa: non più necessaria con design semplificato

// Funzione rimossa: non più necessaria con design semplificato

// Popola i dettagli del bonifico bancario
function populateBankTransferDetails() {
    const bankReference = document.getElementById('bank-reference');
    const bankAmount = document.getElementById('bank-amount');

    if (bankReference && prenotazioneData.id_prenotazione) {
        bankReference.textContent = prenotazioneData.id_prenotazione;
    }

    if (bankAmount && prenotazioneData.importo) {
        bankAmount.textContent = prenotazioneData.importo.toFixed(2);
    }
}

// Popola i dettagli crypto
function populateCryptoDetails() {
    const cryptoAmount = document.getElementById('crypto-amount');

    if (cryptoAmount && prenotazioneData.importo) {
        cryptoAmount.textContent = prenotazioneData.importo.toFixed(2);
    }
}

// Copia un indirizzo negli appunti
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccess('Indirizzo copiato negli appunti!');
    }).catch(() => {
        showError('Impossibile copiare l\'indirizzo');
    });
}

// Gestisce l'invio del form di pagamento con carta
async function handleCardPaymentSubmit(event) {
    event.preventDefault();

    // Disabilita il pulsante e mostra il loading
    setCardLoadingState(true);

    try {
        // Simula un delay per il pagamento
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simula il successo del pagamento
        const simulatedPaymentIntent = {
            id: 'sim_' + Date.now(),
            status: 'succeeded',
            method: 'carta'
        };

        // Gestisci il successo del pagamento simulato
        await handlePaymentSuccess(simulatedPaymentIntent, 'carta');

    } catch (error) {
        console.error('Errore pagamento carta simulato:', error);
        showError('Errore durante il pagamento simulato. Riprova.');
    } finally {
        setCardLoadingState(false);
    }
}

// Gestisce il pagamento PayPal
async function handlePayPalPaymentSubmit(event) {
    event.preventDefault();

    const paypalEmail = document.getElementById('paypal-email').value;
    if (!paypalEmail) {
        showError('Inserisci la tua email PayPal');
        return;
    }

    // Disabilita il pulsante e mostra il loading
    setPayPalLoadingState(true);

    try {
        // Simula un delay per il pagamento PayPal
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simula il successo del pagamento PayPal
        const simulatedPayPalOrder = {
            id: 'paypal_' + Date.now(),
            method: 'paypal'
        };

        await handlePaymentSuccess(simulatedPayPalOrder, 'paypal');
    } catch (error) {
        console.error('Errore pagamento PayPal simulato:', error);
        showError('Errore durante il pagamento PayPal simulato. Riprova.');
    } finally {
        setPayPalLoadingState(false);
    }
}

// Gestisce la conferma del bonifico bancario
async function handleBankTransferConfirm() {
    try {
        // Simula la conferma del bonifico
        await handlePaymentSuccess({
            id: 'bank_' + Date.now(),
            method: 'bonifico'
        }, 'bonifico');
    } catch (error) {
        console.error('Errore conferma bonifico:', error);
        showError('Errore durante la conferma del bonifico. Riprova.');
    }
}

// Gestisce la conferma del pagamento crypto
async function handleCryptoPaymentConfirm() {
    try {
        // Simula la conferma del pagamento crypto
        await handlePaymentSuccess({
            id: 'crypto_' + Date.now(),
            method: 'crypto'
        }, 'crypto');
    } catch (error) {
        console.error('Errore conferma crypto:', error);
        showError('Errore durante la conferma del pagamento crypto. Riprova.');
    }
}

// Crea il PaymentIntent
async function createPaymentIntent() {
    try {
        console.log('Creo PaymentIntent per prenotazione:', prenotazioneData.id_prenotazione);

        // Prepara i metadati per Stripe
        const metadata = {
            id_prenotazione: prenotazioneData.id_prenotazione,
            sede: prenotazioneData.nome_sede || `Sede #${prenotazioneData.id_sede}`,
            spazio: prenotazioneData.nome_spazio || `Spazio #${prenotazioneData.id_spazio}`,
            data_inizio: prenotazioneData.data_inizio,
            data_fine: prenotazioneData.data_fine,
            durata_ore: Math.round((new Date(prenotazioneData.data_fine) - new Date(prenotazioneData.data_inizio)) / (1000 * 60 * 60)),
            importo: prenotazioneData.importo || 0
        };

        console.log('Metadati per Stripe:', metadata);

        const response = await fetchWithTimeout(`${window.CONFIG.API_BASE}/pagamenti/stripe/intent`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_prenotazione: prenotazioneData.id_prenotazione,
                metadata: metadata
            })
        }, 15000);

        console.log('Risposta creazione PaymentIntent:', response.status, response.statusText);

        if (!response.ok) {
            const error = await response.json();
            console.error('Errore creazione PaymentIntent:', error);
            throw new Error(error.error || 'Errore nella creazione del pagamento');
        }

        const paymentIntent = await response.json();
        console.log('PaymentIntent creato:', paymentIntent);

        paymentIntentId = paymentIntent.paymentIntentId;

        return paymentIntent;

    } catch (error) {
        console.error('Errore creazione PaymentIntent:', error);
        throw error;
    }
}

// Aggiorna la funzione handlePaymentSuccess per gestire i diversi metodi
async function handlePaymentSuccess(paymentIntent, method) {
    try {
        // Imposta il flag che il pagamento è stato completato
        pagamentoCompletato = true;

        // Ferma il countdown dello slot
        stopSlotCountdown();

        // Mostra messaggio di successo
        showSuccess('Pagamento completato con successo! La tua prenotazione è stata confermata.');

        // Aggiorna i dettagli della prenotazione
        document.querySelector('.payment-details h4').innerHTML = '<i class="fas fa-check-circle me-2 text-success"></i>Prenotazione Confermata';
        document.querySelector('.payment-details').style.background = 'var(--gray-50)';
        document.querySelector('.payment-details').style.border = '2px solid var(--success)';

        // Aggiungi pulsante per tornare alla dashboard
        const backButton = document.createElement('a');
        backButton.href = 'dashboard.html';
        backButton.className = 'btn btn-outline-primary mt-3';
        backButton.textContent = 'Torna alla Dashboard';
        document.querySelector('.card-body').appendChild(backButton);

        // Opzionale: invia conferma al backend
        await confirmPaymentToBackend(paymentIntent.id, method);

    } catch (error) {
        console.error('Errore conferma pagamento:', error);
    }
}

// Aggiorna la funzione confirmPaymentToBackend per gestire i diversi metodi
async function confirmPaymentToBackend(paymentIntentId, method) {
    try {
        console.log('Confermo pagamento al backend:', method, paymentIntentId);

        if (prenotazioneData && prenotazioneData.id_prenotazione) {
            // Aggiorna lo stato della prenotazione a "confermata" nel backend
            const response = await fetch(`${window.CONFIG.API_BASE}/prenotazioni/${prenotazioneData.id_prenotazione}/confirm`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    method: method,
                    payment_id: paymentIntentId
                })
            });

            if (response.ok) {
                console.log('Stato prenotazione aggiornato a "confermata" nel backend');

                // Elimina prenotazioni duplicate nella stessa data/stanza
                await eliminateDuplicatePrenotazioni();

                // Gestisce prenotazioni multiple stessa sala
                await handleMultiplePrenotazioniSala();
            } else {
                console.error('Errore aggiornamento stato prenotazione:', response.status);
            }
        }

        console.log('Pagamento confermato al backend:', method, paymentIntentId);
    } catch (error) {
        console.error('Errore conferma backend:', error);
    }
}

// Elimina prenotazioni duplicate nella stessa data/stanza
async function eliminateDuplicatePrenotazioni() {
    try {
        if (!prenotazioneData || !prenotazioneData.id_spazio || !prenotazioneData.data_inizio || !prenotazioneData.data_fine) {
            return;
        }

        const response = await fetch(`${window.CONFIG.API_BASE}/prenotazioni/eliminate-duplicates`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_spazio: prenotazioneData.id_spazio,
                data_inizio: prenotazioneData.data_inizio,
                data_fine: prenotazioneData.data_fine,
                exclude_id: prenotazioneData.id_prenotazione // Esclude la prenotazione appena confermata
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Prenotazioni duplicate eliminate:', result.eliminated);
        }
    } catch (error) {
        console.error('Errore eliminazione duplicate:', error);
    }
}

// Gestisce prenotazioni multiple stessa sala
async function handleMultiplePrenotazioniSala() {
    try {
        if (!prenotazioneData || !prenotazioneData.id_spazio || !prenotazioneData.data_inizio || !prenotazioneData.data_fine) {
            return;
        }

        const response = await fetch(`${window.CONFIG.API_BASE}/prenotazioni/handle-multiple-sala`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_spazio: prenotazioneData.id_spazio,
                data_inizio: prenotazioneData.data_inizio,
                data_fine: prenotazioneData.data_fine,
                id_prenotazione_confermata: prenotazioneData.id_prenotazione
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Prenotazioni multiple stessa sala gestite:', result.prenotazioni_cancellate);
        }
    } catch (error) {
        console.error('Errore gestione prenotazioni multiple:', error);
    }
}

// Gestisce lo stato di loading per la carta
function setCardLoadingState(loading) {
    const payButton = document.getElementById('card-pay-button');
    const spinner = document.getElementById('card-loading-spinner');
    const buttonText = document.getElementById('card-button-text');

    if (loading) {
        payButton.disabled = true;
        spinner.style.display = 'inline-block';
        buttonText.textContent = 'Elaborazione...';
    } else {
        payButton.disabled = false;
        spinner.style.display = 'none';
        buttonText.textContent = 'Paga con Carta';
    }
}

// Gestisce lo stato di loading per PayPal
function setPayPalLoadingState(loading) {
    const payButton = document.getElementById('paypal-pay-button');
    const spinner = document.getElementById('paypal-loading-spinner');
    const buttonText = document.getElementById('paypal-button-text');

    if (loading) {
        payButton.disabled = true;
        spinner.style.display = 'inline-block';
        buttonText.textContent = 'Elaborazione...';
    } else {
        payButton.disabled = false;
        spinner.style.display = 'none';
        buttonText.textContent = 'Paga con PayPal';
    }
}

// Rimuove le funzioni obsolete
// setLoadingState e handlePaymentSubmit non sono più necessarie

// Mostra/nasconde il loading globale
function setGlobalLoading(loading) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (loading) {
            loadingOverlay.classList.remove('d-none');
        } else {
            loadingOverlay.classList.add('d-none');
        }
    }
}

// Mostra messaggio di errore
function showError(message) {
    // Crea un alert temporaneo usando la funzione globale se disponibile
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'error');
    } else {
        // Fallback: mostra alert nativo
        alert('Errore: ' + message);
    }
}

// Mostra messaggio di successo
function showSuccess(message) {
    // Crea un alert temporaneo usando la funzione globale se disponibile
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'success');
    } else {
        // Fallback: mostra alert nativo
        alert('Successo: ' + message);
    }
}

// Aggiunge pulsante di retry
function addRetryButton() {
    const container = document.querySelector('.card-body');

    // Rimuovi pulsante retry esistente se presente
    const existingRetry = document.getElementById('retry-button');
    if (existingRetry) {
        existingRetry.remove();
    }

    const retryButton = document.createElement('button');
    retryButton.id = 'retry-button';
    retryButton.className = 'btn btn-outline-primary mt-3';
    retryButton.textContent = '🔄 Riprova';
    retryButton.onclick = retryInitialization;

    container.appendChild(retryButton);
}

// Funzione per riprovare l'inizializzazione
async function retryInitialization() {
    console.log('Riprovo inizializzazione...');

    // Rimuovi pulsante retry
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
        retryButton.remove();
    }

    // Non è più necessario nascondere messaggi di errore specifici

    // Recupera l'ID della prenotazione dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const prenotazioneId = urlParams.get('id');

    if (!prenotazioneId) {
        showError('ID prenotazione mancante. Torna alla dashboard e riprova.');
        return;
    }

    // Riprova inizializzazione
    await initializePage(prenotazioneId);
}

// Verifica se l'utente è autenticato
function checkAuthentication() {
    const user = localStorage.getItem('user');

    if (!user) {
        // Reindirizza al login
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return false;
    }

    try {
        const userData = JSON.parse(user);
        return true;
    } catch (error) {
        // Reindirizza al login
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return false;
    }
}

// Logout locale - chiama la funzione centralizzata
function handleLogout() {
    // Usa la funzione centralizzata di config.js
    if (typeof window.logout === 'function') {
        window.logout();
    } else {
        // Fallback se la funzione non è disponibile
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// Inizializzazione della pagina
$(document).ready(async function () {
    console.log('pagamento.js - Inizializzazione pagina');

    // Inizializza la navbar universale
    if (typeof window.initializeNavbar === 'function') {
        window.initializeNavbar();
    } else {
        console.log('pagamento.js - Sistema navbar universale non disponibile');
    }

    try {
        // Verifica se abbiamo parametri URL per creare una nuova prenotazione
        const urlParams = new URLSearchParams(window.location.search);
        const sede = urlParams.get('sede');
        const spazio = urlParams.get('spazio');
        const dataInizio = urlParams.get('dal');
        const dataFine = urlParams.get('al');

        if (sede && spazio && dataInizio && dataFine) {
            console.log('Parametri prenotazione trovati nell\'URL:', { sede, spazio, dataInizio, dataFine });

            // Crea la prenotazione automaticamente
            await createPrenotazioneFromParams(sede, spazio, dataInizio, dataFine);
        } else {
            // Cerca ID prenotazione nell'URL (flusso normale)
            const prenotazioneId = new URLSearchParams(window.location.search).get('id_prenotazione');

            if (!prenotazioneId) {
                console.error('ID prenotazione mancante nell\'URL');
                showError('ID prenotazione mancante. Torna alla dashboard e riprova.');
                return;
            }

            console.log('ID prenotazione trovato:', prenotazioneId);

            // Avvia inizializzazione normale
            await initializePage(prenotazioneId);
        }
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);
        addRetryButton();
    }
});
