// Configurazione API dinamica per supportare sia sviluppo locale che produzione
const CONFIG = {
    // URL del backend - può essere configurato tramite variabili d'ambiente o fallback
    API_BASE: (() => {
        // Se siamo su Render, usa l'URL di produzione
        if (window.location.hostname.includes('onrender.com')) {
            return 'https://coworking-mio-1-backend.onrender.com/api';
        }
        // Se siamo in sviluppo locale, usa localhost
        return 'http://localhost:3002/api';
    })(),

    // Configurazione Supabase (solo per autenticazione se necessario)
    SUPABASE_URL: 'https://czkiuvmhijhxuqzdtnmz.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6a2l1dm1oaWpoeHVxemR0bm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjA5OTEsImV4cCI6MjA3MDQ5Njk5MX0.k2HuloheKebEfOXRYnvHq5smVzNZlnQAWNHZzetKxeY'
};

// Debug: log della configurazione per verificare che sia caricata
console.log('Configurazione caricata:', CONFIG);
console.log('API_BASE:', CONFIG.API_BASE);
console.log('Hostname corrente:', window.location.hostname);
console.log('Ambiente rilevato:', window.location.hostname.includes('onrender.com') ? 'PRODUZIONE' : 'SVILUPPO');

// Funzione per aggiungere l'header di autorizzazione alle richieste API
function getAuthHeaders() {
    const user = localStorage.getItem('user');

    console.log('getAuthHeaders - User:', user);

    if (user) {
        try {
            const userData = JSON.parse(user);
            // Usa l'id_utente come identificatore di sessione
            return {
                'X-User-ID': userData.id_utente,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            console.error('Errore parsing user:', error);
            // Se c'è un errore nel parsing, rimuovi i dati corrotti
            localStorage.removeItem('user');
        }
    }

    // Se non c'è utente, restituisci solo gli header base
    // NON interferire con il flusso di prenotazione
    return {
        'Content-Type': 'application/json'
    };
}

// Funzione per gestire errori di autenticazione
function handleAuthError() {
    console.log('handleAuthError - Utente deve loggarsi per completare questa azione');

    // Rimuovi solo i dati di sessione corrotti, non tutti
    try {
        const user = localStorage.getItem('user');
        if (user) {
            JSON.parse(user); // Testa se è valido
        }
    } catch (error) {
        // Solo se i dati sono corrotti, rimuovili
        localStorage.removeItem('user');
    }

    // Reindirizza al login con messaggio chiaro e appropriato
    const currentPage = window.location.pathname.split('/').pop();
    let message = 'Devi effettuare il login per completare questa azione.';

    // Personalizza il messaggio in base alla pagina
    if (currentPage === 'prenota.html') {
        message = 'Devi effettuare il login per completare la prenotazione.';
    } else if (currentPage === 'pagamento.html') {
        message = 'Devi effettuare il login per completare il pagamento.';
    } else if (currentPage === 'dashboard.html') {
        message = 'Devi effettuare il login per accedere alla dashboard.';
    }

    const loginUrl = 'login.html?message=' + encodeURIComponent(message);
    window.location.href = loginUrl;
}

// Funzione centralizzata per il logout
function logout() {
    console.log('logout - Effettuo logout utente');

    // Salva la pagina corrente per il redirect dopo il login
    const currentPage = window.location.pathname.split('/').pop();
    const currentUrl = window.location.href;
    
    // Determina se la pagina corrente richiede autenticazione
    const requiresAuth = isPageRequiringAuth(currentPage);
    
    if (requiresAuth) {
        // Se la pagina richiede autenticazione, salva l'URL per il redirect
        localStorage.setItem('redirectAfterLogin', currentUrl);
        console.log('logout - Pagina richiede auth, salvo URL per redirect:', currentUrl);
    } else {
        // Se la pagina non richiede auth, non salvare nulla
        localStorage.removeItem('redirectAfterLogin');
        console.log('logout - Pagina non richiede auth, rimango qui');
    }

    // Pulisci i dati della prenotazione in corso se siamo su prenota.html
    if (currentPage === 'prenota.html') {
        localStorage.removeItem('selectedSede');
        localStorage.removeItem('selectedSpazio');
        localStorage.removeItem('selectedDataInizio');
        localStorage.removeItem('selectedDataFine');
        localStorage.removeItem('disponibilitaVerificata');
        console.log('logout - Puliti dati prenotazione in corso');
    }

    // Rimuovi solo i dati di sessione, non tutto
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    if (requiresAuth) {
        // Reindirizza al login se la pagina richiede autenticazione
        window.location.href = 'login.html?message=' + encodeURIComponent('Logout effettuato con successo.');
    } else {
        // Rimani nella pagina corrente se non richiede autenticazione
        // Ricarica la pagina per aggiornare la navbar
        window.location.reload();
    }
}

// Funzione per verificare se l'utente è autenticato
function isAuthenticated() {
    const user = localStorage.getItem('user');
    if (!user) return false;

    try {
        const userData = JSON.parse(user);
        return userData && userData.id_utente;
    } catch (error) {
        console.error('Errore parsing user:', error);
        return false;
    }
}

// Funzione per verificare la validità della sessione all'avvio
async function validateTokenOnStartup() {
    const user = localStorage.getItem('user');

    console.log('validateTokenOnStartup - User:', user);

    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('validateTokenOnStartup - Sessione valida per utente:', userData.nome, userData.cognome);

            // Verifica che l'utente abbia i campi necessari
            if (!userData.id_utente || !userData.nome || !userData.cognome) {
                console.log('validateTokenOnStartup - Dati utente incompleti, rimuovo sessione');
                localStorage.removeItem('user');
                return false;
            }

            return true;
        } catch (error) {
            console.log('validateTokenOnStartup - Errore parsing user:', error);
            // User non valido, pulisci i dati
            localStorage.removeItem('user');
            return false;
        }
    } else {
        console.log('validateTokenOnStartup - Nessun user trovato');
        return false;
    }
}

// Funzione per verificare se una pagina richiede autenticazione
function isPageRequiringAuth(pageName) {
    const pagesRequiringAuth = [
        'dashboard.html',
        'pagamento.html',
        'dashboard-responsabili.html'
    ];
    
    // La pagina prenota.html non richiede autenticazione iniziale
    // ma potrebbe richiederla per completare la prenotazione
    // In questo caso, salviamo comunque l'URL per il redirect
    if (pageName === 'prenota.html') {
        // Controlla se c'è una prenotazione in corso
        const hasPrenotazioneInCorso = localStorage.getItem('selectedSede') || 
                                      localStorage.getItem('selectedSpazio') || 
                                      localStorage.getItem('selectedDataInizio') || 
                                      localStorage.getItem('selectedDataFine');
        return hasPrenotazioneInCorso;
    }
    
    return pagesRequiringAuth.includes(pageName);
}

// Esporta per uso globale
window.CONFIG = CONFIG;
window.getAuthHeaders = getAuthHeaders;
window.handleAuthError = handleAuthError;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.validateTokenOnStartup = validateTokenOnStartup;
window.isPageRequiringAuth = isPageRequiringAuth;

