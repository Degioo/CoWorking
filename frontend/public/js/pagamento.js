// Configurazione API
const API_BASE = window.CONFIG ? window.CONFIG.API_BASE : 'http://localhost:3002/api';

// Configurazione Stripe
let stripe;
let elements;
let card;
let paymentIntentId;

// Dati della prenotazione
let prenotazioneData = {};

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

// Verifica elementi DOM necessari
function checkRequiredElements() {
    const requiredElements = [
        'card-element',
        'payment-form',
        'data-prenotazione',
        'orario-prenotazione',
        'durata-prenotazione',
        'posto-prenotazione',
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
        const response = await fetchWithTimeout(`${API_BASE}/ping`, {}, 5000);

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
        const response = await fetchWithTimeout(`${API_BASE}/prenotazioni/${prenotazioneId}`, {}, 10000);

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
        const response = await fetchWithTimeout(`${API_BASE}/pagamenti/stripe/status/${prenotazioneId}`, {}, 10000);

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
        const response = await fetchWithTimeout(`${API_BASE}/prenotazioni/${prenotazioneId}`, {}, 10000);

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

// Inizializzazione
document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOM caricato, inizio inizializzazione...');

    // Verifica autenticazione
    if (!checkAuthentication()) {
        console.log('Utente non autenticato, reindirizzamento al login');
        return;
    }

    // Verifica se l'ID della prenotazione è presente nell'URL
    const urlParams = new URLSearchParams(window.location.search);
    const prenotazioneId = urlParams.get('id');

    if (!prenotazioneId) {
        console.error('ID prenotazione mancante nell\'URL');
        showError('ID prenotazione mancante. Torna alla dashboard e riprova.');
        return;
    }

    console.log('ID prenotazione trovato:', prenotazioneId);

    // Avvia inizializzazione
    await initializePage(prenotazioneId);
});

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

        // Verifica se Stripe è disponibile
        if (typeof Stripe === 'undefined') {
            throw new Error('Libreria Stripe non caricata. Verifica la connessione internet.');
        }

        // Recupera la configurazione pubblica di Stripe
        console.log('initializeStripe - Chiamo API config Stripe:', `${API_BASE}/pagamenti/stripe/config`);

        const response = await fetchWithTimeout(`${API_BASE}/pagamenti/stripe/config`, {}, 15000);
        console.log('initializeStripe - Risposta config ricevuta:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('initializeStripe - Errore API config:', errorText);
            throw new Error(`Errore configurazione Stripe: ${response.status} ${response.statusText}`);
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

        card.mount('#card-element');

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

    } catch (error) {
        console.error('Errore inizializzazione Stripe:', error);
        showError('Errore configurazione pagamento: ' + error.message);
        throw error; // Rilancia l'errore per gestirlo nel chiamante
    }
}

// Carica i dati della prenotazione
async function loadPrenotazioneData() {
    try {
        console.log('loadPrenotazioneData - Inizio');

        // Recupera l'ID della prenotazione dall'URL
        const urlParams = new URLSearchParams(window.location.search);
        const prenotazioneId = urlParams.get('id');

        console.log('loadPrenotazioneData - ID prenotazione:', prenotazioneId);

        if (!prenotazioneId) {
            throw new Error('ID prenotazione non specificato');
        }

        console.log('loadPrenotazioneData - Chiamo API:', `${API_BASE}/prenotazioni/${prenotazioneId}`);

        // Recupera i dati della prenotazione
        const response = await fetchWithTimeout(`${API_BASE}/prenotazioni/${prenotazioneId}`, {}, 15000);

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
        document.getElementById('data-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('orario-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('durata-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('posto-prenotazione').textContent = 'Errore caricamento';
        document.getElementById('totale-prenotazione').textContent = 'Errore caricamento';
    }
}

// Popola i dettagli della prenotazione
function populatePrenotazioneDetails() {
    if (!prenotazioneData) return;

    const dataInizio = new Date(prenotazioneData.data_inizio);
    const dataFine = new Date(prenotazioneData.data_fine);

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
    document.getElementById('data-prenotazione').textContent = dataFormattata;
    document.getElementById('orario-prenotazione').textContent = `${orarioInizio} - ${orarioFine}`;
    document.getElementById('durata-prenotazione').textContent = `${durataOre} ore`;
    document.getElementById('posto-prenotazione').textContent = `${prenotazioneData.nome_spazio || 'Spazio'} - ${prenotazioneData.nome_sede || 'Sede'}`;
    document.getElementById('totale-prenotazione').textContent = `€${importo.toFixed(2)}`;

    // Salva l'importo per il pagamento
    prenotazioneData.importo = importo;
}

// Configura gli event listener
function setupEventListeners() {
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', handlePaymentSubmit);
}

// Gestisce l'invio del form di pagamento
async function handlePaymentSubmit(event) {
    event.preventDefault();

    if (!stripe || !card) {
        showError('Stripe non è stato inizializzato correttamente.');
        return;
    }

    // Disabilita il pulsante e mostra il loading
    setLoadingState(true);

    try {
        // Crea il PaymentIntent
        const paymentIntent = await createPaymentIntent();

        if (!paymentIntent) {
            throw new Error('Errore nella creazione del pagamento');
        }

        // Conferma il pagamento
        const result = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
            payment_method: {
                card: card,
                billing_details: {
                    name: prenotazioneData.nome_utente || 'Utente',
                    email: prenotazioneData.email_utente || ''
                }
            }
        });

        if (result.error) {
            // Errore nel pagamento
            throw new Error(result.error.message);
        } else if (result.paymentIntent.status === 'succeeded') {
            // Pagamento completato con successo
            await handlePaymentSuccess(result.paymentIntent);
        } else {
            // Pagamento in attesa
            showError('Il pagamento è in elaborazione. Controlla la tua email per conferme.');
        }

    } catch (error) {
        console.error('Errore pagamento:', error);
        showError(error.message || 'Errore durante il pagamento. Riprova.');
    } finally {
        setLoadingState(false);
    }
}

// Crea il PaymentIntent
async function createPaymentIntent() {
    try {
        const response = await fetch(`${API_BASE}/pagamenti/stripe/intent`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_prenotazione: prenotazioneData.id_prenotazione
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Errore nella creazione del pagamento');
        }

        const paymentIntent = await response.json();
        paymentIntentId = paymentIntent.paymentIntentId;

        return paymentIntent;

    } catch (error) {
        console.error('Errore creazione PaymentIntent:', error);
        throw error;
    }
}

// Gestisce il successo del pagamento
async function handlePaymentSuccess(paymentIntent) {
    try {
        // Mostra messaggio di successo
        showSuccess('Pagamento completato con successo! La tua prenotazione è stata confermata.');

        // Nascondi il form di pagamento
        document.getElementById('payment-form').style.display = 'none';

        // Aggiorna i dettagli della prenotazione
        document.querySelector('.payment-details h3').textContent = '✅ Prenotazione Confermata';
        document.querySelector('.payment-details').style.background = '#d4edda';
        document.querySelector('.payment-details').style.border = '1px solid #c3e6cb';

        // Aggiungi pulsante per tornare alla dashboard
        const backButton = document.createElement('a');
        backButton.href = 'dashboard.html';
        backButton.className = 'pay-button';
        backButton.style.marginTop = '20px';
        backButton.textContent = 'Torna alla Dashboard';
        document.querySelector('.payment-container').appendChild(backButton);

        // Opzionale: invia conferma al backend
        await confirmPaymentToBackend(paymentIntent.id);

    } catch (error) {
        console.error('Errore conferma pagamento:', error);
    }
}

// Conferma il pagamento al backend
async function confirmPaymentToBackend(paymentIntentId) {
    try {
        await fetch(`${API_BASE}/pagamenti/stripe/complete`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                payment_intent_id: paymentIntentId
            })
        });
    } catch (error) {
        console.error('Errore conferma backend:', error);
    }
}

// Gestisce lo stato di loading
function setLoadingState(loading) {
    const button = document.getElementById('pay-button');
    const spinner = document.getElementById('loading-spinner');
    const buttonText = document.getElementById('button-text');

    if (loading) {
        button.disabled = true;
        spinner.style.display = 'inline-block';
        buttonText.textContent = 'Elaborazione...';
    } else {
        button.disabled = false;
        spinner.style.display = 'none';
        buttonText.textContent = 'Paga Ora';
    }
}

// Mostra/nasconde il loading globale
function setGlobalLoading(loading) {
    const loadingDiv = document.getElementById('global-loading');
    if (loadingDiv) {
        loadingDiv.style.display = loading ? 'block' : 'none';
    }

    // Mostra anche un messaggio di caricamento
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = loading ? 'block' : 'none';
    }
}

// Mostra messaggio di errore
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Nascondi il messaggio dopo 5 secondi
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Mostra messaggio di successo
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
}

// Aggiunge pulsante di retry
function addRetryButton() {
    const container = document.querySelector('.payment-container');

    // Rimuovi pulsante retry esistente se presente
    const existingRetry = document.getElementById('retry-button');
    if (existingRetry) {
        existingRetry.remove();
    }

    const retryButton = document.createElement('button');
    retryButton.id = 'retry-button';
    retryButton.className = 'pay-button';
    retryButton.style.marginTop = '20px';
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

    // Nascondi messaggi di errore
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

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

// Logout
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
