// Configurazione API
const API_BASE = window.CONFIG ? window.CONFIG.API_BASE : 'http://localhost:3002/api';

// Configurazione Stripe
let stripe;
let elements;
let card;
let paymentIntentId;

// Dati della prenotazione
let prenotazioneData = {};

// Inizializzazione
document.addEventListener('DOMContentLoaded', async function () {
    // Verifica validità token all'avvio
    await validateTokenOnStartup();

    await initializeStripe();
    await loadPrenotazioneData();
    setupEventListeners();
});

// Inizializza Stripe
async function initializeStripe() {
    try {
        // Recupera la configurazione pubblica di Stripe
        const response = await fetch(`${API_BASE}/pagamenti/stripe/config`);
        const config = await response.json();

        if (!config.publishableKey) {
            throw new Error('Chiave pubblica Stripe non configurata');
        }

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

        console.log('Stripe inizializzato con successo');

    } catch (error) {
        console.error('Errore inizializzazione Stripe:', error);
        showError('Errore configurazione pagamento. Riprova più tardi.');
    }
}

// Carica i dati della prenotazione
async function loadPrenotazioneData() {
    try {
        // Recupera l'ID della prenotazione dall'URL
        const urlParams = new URLSearchParams(window.location.search);
        const prenotazioneId = urlParams.get('id');

        if (!prenotazioneId) {
            throw new Error('ID prenotazione non specificato');
        }

        // Recupera i dati della prenotazione
        const response = await fetch(`${API_BASE}/prenotazioni/${prenotazioneId}`);
        if (!response.ok) {
            throw new Error('Errore nel recupero della prenotazione');
        }

        prenotazioneData = await response.json();

        // Popola i dettagli della prenotazione
        populatePrenotazioneDetails();

    } catch (error) {
        console.error('Errore caricamento prenotazione:', error);
        showError('Errore nel caricamento dei dati della prenotazione.');
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
