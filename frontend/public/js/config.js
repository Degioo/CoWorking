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
    const token = localStorage.getItem('authToken');
    if (token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
    return {
        'Content-Type': 'application/json'
    };
}

// Funzione per gestire errori di autenticazione
function handleAuthError() {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    alert('Sessione scaduta. Effettua nuovamente il login.');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

// Funzione per verificare la validità del token all'avvio
async function validateTokenOnStartup() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');

    if (token && user) {
        try {
            // Verifica la validità del token chiamando un endpoint protetto
            const response = await fetch(`${CONFIG.API_BASE}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // Token non valido, pulisci i dati
                localStorage.removeItem('user');
                localStorage.removeItem('authToken');
                console.log('Token non valido, logout automatico effettuato');
            }
        } catch (error) {
            // Errore di rete o token non valido, pulisci i dati
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            console.log('Errore validazione token, logout automatico effettuato');
        }
    }
}

// Esporta per uso globale
window.CONFIG = CONFIG;
window.getAuthHeaders = getAuthHeaders;
window.handleAuthError = handleAuthError;
window.validateTokenOnStartup = validateTokenOnStartup;

