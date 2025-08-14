// Configurazione API - Backend su Render
const CONFIG = {
    // URL del backend su Render
    API_BASE: 'https://coworking-mio-1-backend.onrender.com/api',

    // Fallback per sviluppo locale
    // API_BASE: 'http://localhost:3002/api',

    // Configurazione Supabase (solo per autenticazione se necessario)
    SUPABASE_URL: 'https://czkiuvmhijhxuqzdtnmz.supabase.co',
    SUPABASE_ANON_KEY: 'your-supabase-anon-key-here'
};

// Debug: log della configurazione per verificare che sia caricata
console.log('Configurazione caricata:', CONFIG);
console.log('API_BASE:', CONFIG.API_BASE);

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

    // Se non c'è utente o c'è stato un errore, reindirizza al login
    if (window.location.pathname.split('/').pop() !== 'login.html') {
        console.log('getAuthHeaders - Utente non autenticato, reindirizzamento al login');
        setTimeout(() => {
            handleAuthError();
        }, 100);
    }

    return {
        'Content-Type': 'application/json'
    };
}

// Funzione per gestire errori di autenticazione
function handleAuthError() {
    console.log('handleAuthError - Sessione scaduta, reindirizzamento al login');
    
    // Rimuovi tutti i dati di sessione
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.clear();
    
    // Mostra messaggio all'utente
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'login.html') {
        // Se siamo già nella pagina di login, non fare nulla
        return;
    }
    
    // Reindirizza al login con messaggio
    const loginUrl = 'login.html?message=' + encodeURIComponent('Sessione scaduta. Effettua nuovamente il login.');
    window.location.href = loginUrl;
}

// Funzione centralizzata per il logout
function logout() {
    console.log('logout - Effettuo logout utente');
    
    // Rimuovi tutti i dati di sessione
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.clear();
    
    // Reindirizza al login
    window.location.href = 'login.html?message=' + encodeURIComponent('Logout effettuato con successo.');
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

// Esporta per uso globale
window.CONFIG = CONFIG;
window.getAuthHeaders = getAuthHeaders;
window.handleAuthError = handleAuthError;
window.validateTokenOnStartup = validateTokenOnStartup;
window.logout = logout;
window.isAuthenticated = isAuthenticated;

