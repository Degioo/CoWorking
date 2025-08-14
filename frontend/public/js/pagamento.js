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

        const response = await fetchWithTimeout(`${API_BASE}/prenotazioni`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': userData.id_utente
            },
            body: JSON.stringify(prenotazioneData)
        }, 15000);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Errore nella creazione della prenotazione');
        }

        const prenotazione = await response.json();
        console.log('Prenotazione creata:', prenotazione);

        // Salva i dati della prenotazione
        window.prenotazioneData = prenotazione;

        // Avvia inizializzazione con la nuova prenotazione
        await initializePage(prenotazione.id_prenotazione);

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
    // Event listener per la selezione del metodo di pagamento
    const methodCards = document.querySelectorAll('.payment-method-card');
    methodCards.forEach(card => {
        card.addEventListener('click', () => selectPaymentMethod(card.dataset.method));
    });

    // Event listener per tornare alla selezione metodo
    const backToMethodsBtn = document.getElementById('back-to-methods');
    if (backToMethodsBtn) {
        backToMethodsBtn.addEventListener('click', showPaymentMethodSelection);
    }

    // Event listener per i form di pagamento
    const cardForm = document.getElementById('card-payment-form');
    if (cardForm) {
        cardForm.addEventListener('submit', handleCardPaymentSubmit);
    }

    const paypalForm = document.getElementById('paypal-payment-form');
    if (paypalForm) {
        paypalForm.addEventListener('submit', handlePayPalPaymentSubmit);
    }

    const bankConfirmBtn = document.getElementById('bank-confirm-button');
    if (bankConfirmBtn) {
        bankConfirmBtn.addEventListener('click', handleBankTransferConfirm);
    }

    const cryptoConfirmBtn = document.getElementById('crypto-confirm-button');
    if (cryptoConfirmBtn) {
        cryptoConfirmBtn.addEventListener('click', handleCryptoPaymentConfirm);
    }

    // Event listener per i pulsanti di copia indirizzi crypto
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => copyToClipboard(btn.dataset.address));
    });
}

// Gestisce la selezione del metodo di pagamento
function selectPaymentMethod(method) {
    console.log('Metodo di pagamento selezionato:', method);
    
    // Nascondi la selezione del metodo
    const methodSelection = document.getElementById('payment-method-selection');
    methodSelection.style.display = 'none';
    
    // Mostra i form di pagamento
    const paymentForms = document.getElementById('payment-forms');
    paymentForms.style.display = 'block';
    
    // Nascondi tutti i form
    const allForms = document.querySelectorAll('.payment-form');
    allForms.forEach(form => form.style.display = 'none');
    
    // Mostra il form appropriato
    switch (method) {
        case 'card':
            document.getElementById('card-payment-form').style.display = 'block';
            // Inizializza Stripe se non è già inizializzato
            if (!stripe) {
                initializeStripe();
            }
            break;
            
        case 'paypal':
            document.getElementById('paypal-payment-form').style.display = 'block';
            break;
            
        case 'bank-transfer':
            document.getElementById('bank-transfer-form').style.display = 'block';
            // Popola i dettagli del bonifico
            populateBankTransferDetails();
            break;
            
        case 'crypto':
            document.getElementById('crypto-payment-form').style.display = 'block';
            // Popola i dettagli crypto
            populateCryptoDetails();
            break;
    }
    
    // Mostra il pulsante per tornare alla selezione
    document.getElementById('back-to-methods').style.display = 'block';
}

// Mostra di nuovo la selezione del metodo di pagamento
function showPaymentMethodSelection() {
    // Nascondi i form di pagamento
    const paymentForms = document.getElementById('payment-forms');
    paymentForms.style.display = 'none';
    
    // Mostra la selezione del metodo
    const methodSelection = document.getElementById('payment-method-selection');
    methodSelection.style.display = 'block';
    
    // Nascondi il pulsante per tornare
    document.getElementById('back-to-methods').style.display = 'none';
}

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

    if (!stripe || !card) {
        showError('Stripe non è stato inizializzato correttamente.');
        return;
    }

    // Disabilita il pulsante e mostra il loading
    setCardLoadingState(true);

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
            await handlePaymentSuccess(result.paymentIntent, 'carta');
        } else {
            // Pagamento in attesa
            showError('Il pagamento è in elaborazione. Controlla la tua email per conferme.');
        }

    } catch (error) {
        console.error('Errore pagamento carta:', error);
        showError(error.message || 'Errore durante il pagamento. Riprova.');
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
        // Simula la creazione di un ordine PayPal
        const paypalOrder = await createPayPalOrder(paypalEmail);
        
        if (paypalOrder) {
            // Simula il successo del pagamento PayPal
            await handlePaymentSuccess({ id: paypalOrder.id, method: 'paypal' }, 'paypal');
        }
    } catch (error) {
        console.error('Errore pagamento PayPal:', error);
        showError(error.message || 'Errore durante il pagamento PayPal. Riprova.');
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
        
        const response = await fetchWithTimeout(`${API_BASE}/pagamenti/stripe/intent`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_prenotazione: prenotazioneData.id_prenotazione
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
        let methodText = '';
        switch (method) {
            case 'carta':
                methodText = 'con carta di credito';
                break;
            case 'paypal':
                methodText = 'con PayPal';
                break;
            case 'bonifico':
                methodText = 'con bonifico bancario';
                break;
            case 'crypto':
                methodText = 'in criptovalute';
                break;
            default:
                methodText = '';
        }

        // Mostra messaggio di successo
        showSuccess(`Pagamento completato con successo ${methodText}! La tua prenotazione è stata confermata.`);

        // Nascondi tutti i form di pagamento
        document.getElementById('payment-forms').style.display = 'none';
        document.getElementById('back-to-methods').style.display = 'none';

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
        await confirmPaymentToBackend(paymentIntent.id, method);

    } catch (error) {
        console.error('Errore conferma pagamento:', error);
    }
}

// Aggiorna la funzione confirmPaymentToBackend per gestire i diversi metodi
async function confirmPaymentToBackend(paymentIntentId, method) {
    try {
        if (method === 'carta') {
            // Per pagamenti con carta, usa l'endpoint Stripe
            await fetch(`${API_BASE}/pagamenti/stripe/complete`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    payment_intent_id: paymentIntentId
                })
            });
        } else {
            // Per altri metodi, usa l'endpoint generico
            await fetch(`${API_BASE}/pagamenti/confirm`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    payment_intent_id: paymentIntentId,
                    method: method,
                    id_prenotazione: prenotazioneData.id_prenotazione
                })
            });
        }
        
        console.log('Pagamento confermato al backend:', method, paymentIntentId);
    } catch (error) {
        console.error('Errore conferma backend:', error);
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

// Inizializzazione della pagina
$(document).ready(async function () {
    console.log('pagamento.js - Inizializzazione pagina');

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
