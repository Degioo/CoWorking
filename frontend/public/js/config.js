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
        }
    }

    return {
        'Content-Type': 'application/json'
    };
}

// Funzione per gestire errori di autenticazione
function handleAuthError() {
    localStorage.removeItem('user');
    alert('Sessione scaduta. Effettua nuovamente il login.');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

// Funzione per verificare la validità della sessione all'avvio
async function validateTokenOnStartup() {
    const user = localStorage.getItem('user');

    console.log('validateTokenOnStartup - User:', user);

    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('validateTokenOnStartup - Sessione valida per utente:', userData.nome, userData.cognome);
            // Per ora non facciamo validazione automatica, manteniamo la sessione
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

