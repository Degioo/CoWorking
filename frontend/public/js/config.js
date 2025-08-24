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
    const token = localStorage.getItem('token');

    console.log('getAuthHeaders - User:', user);
    console.log('getAuthHeaders - Token:', token ? 'presente' : 'mancante');

    if (user && token) {
        try {
            const userData = JSON.parse(user);
            // Usa il token JWT per l'autenticazione
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            console.error('Errore parsing user:', error);
            // Se c'è un errore nel parsing, rimuovi i dati corrotti
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
    }

    // Se non c'è utente o token, restituisci solo gli header base
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
    if (currentPage === 'selezione-slot.html') {
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

    // Pulisci i dati della prenotazione in corso se siamo su selezione-slot.html
    if (currentPage === 'selezione-slot.html') {
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
    const token = localStorage.getItem('token');

    if (!user || !token) {
        console.log('isAuthenticated - User o token mancanti:', { user: !!user, token: !!token });
        return false;
    }

    try {
        const userData = JSON.parse(user);
        const isAuthenticated = userData && userData.id_utente;
        console.log('isAuthenticated - Risultato:', isAuthenticated, 'per utente:', userData?.nome, userData?.cognome);
        return isAuthenticated;
    } catch (error) {
        console.error('isAuthenticated - Errore parsing user:', error);
        return false;
    }
}

// Funzione per verificare la validità della sessione all'avvio
async function validateTokenOnStartup() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    console.log('validateTokenOnStartup - User:', user);
    console.log('validateTokenOnStartup - Token:', token ? 'presente' : 'mancante');

    if (user && token) {
        try {
            const userData = JSON.parse(user);
            console.log('validateTokenOnStartup - Sessione valida per utente:', userData.nome, userData.cognome);

            // Verifica che l'utente abbia i campi necessari
            if (!userData.id_utente || !userData.nome || !userData.cognome) {
                console.log('validateTokenOnStartup - Dati utente incompleti, rimuovo sessione');
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                return false;
            }

            return true;
        } catch (error) {
            console.log('validateTokenOnStartup - Errore parsing user:', error);
            // User non valido, pulisci i dati
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return false;
        }
    } else {
        console.log('validateTokenOnStartup - User o token mancanti');
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

    // La pagina selezione-slot.html non richiede autenticazione iniziale
    // ma potrebbe richiederla per completare la prenotazione
    // In questo caso, salviamo comunque l'URL per il redirect
    if (pageName === 'selezione-slot.html') {
        // Controlla se c'è una prenotazione in corso
        const hasPrenotazioneInCorso = localStorage.getItem('selectedSede') ||
            localStorage.getItem('selectedSpazio') ||
            localStorage.getItem('selectedDataInizio') ||
            localStorage.getItem('selectedDataFine');
        return hasPrenotazioneInCorso;
    }

    return pagesRequiringAuth.includes(pageName);
}

// ===== NAVBAR UNIVERSALE =====
// Sistema centralizzato per gestire la navbar in tutte le pagine

// Configurazione navbar per diverse pagine
const NAVBAR_CONFIG = {
    // Pagina: { mostraDashboard: boolean, mostraLogout: boolean, mostraAccedi: boolean }
    'index.html': { mostraDashboard: true, mostraLogout: true, mostraAccedi: true },
    'selezione-slot.html': { mostraDashboard: true, mostraLogout: true, mostraAccedi: false },
    'catalogo.html': { mostraDashboard: true, mostraLogout: true, mostraAccedi: false },
    'pagamento.html': { mostraDashboard: true, mostraLogout: true, mostraAccedi: false },
    'dashboard.html': { mostraDashboard: false, mostraLogout: true, mostraAccedi: false },
    'dashboard-responsabili.html': { mostraDashboard: false, mostraLogout: true, mostraAccedi: false }
};

// Funzione universale per aggiornare la navbar
function updateNavbarUniversal() {
    console.log('updateNavbarUniversal - Inizio aggiornamento navbar');

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const config = NAVBAR_CONFIG[currentPage] || NAVBAR_CONFIG['index.html'];
    const userStr = localStorage.getItem('user');

    console.log('updateNavbarUniversal - Pagina corrente:', currentPage);
    console.log('updateNavbarUniversal - Config:', config);
    console.log('updateNavbarUniversal - Utente:', userStr ? 'loggato' : 'non loggato');

    // Trova la sezione auth
    const authSection = document.getElementById('authSection');
    if (!authSection) {
        console.log('updateNavbarUniversal - Sezione auth non trovata, navbar non aggiornata');
        return;
    }

    // Rimuovi tutti i link dinamici esistenti (Dashboard, Logout, Accedi)
    document.querySelectorAll('.nav-item.dynamic-nav-item').forEach(item => item.remove());

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('updateNavbarUniversal - Utente autenticato:', user.nome, user.cognome);

            // Aggiorna la sezione auth con info utente
            authSection.innerHTML = `
                <span class="nav-link text-light">
                    <i class="fas fa-user me-2"></i>${user.nome} ${user.cognome}
                    <small class="d-block text-muted">${user.ruolo}</small>
                </span>
            `;

            // Aggiungi Dashboard se richiesto dalla configurazione
            if (config.mostraDashboard) {
                const dashboardItem = `
                    <li class="nav-item dynamic-nav-item">
                        <a class="nav-link" href="dashboard.html">
                            <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                        </a>
                    </li>
                `;
                authSection.insertAdjacentHTML('afterend', dashboardItem);
            }

            // Aggiungi Logout se richiesto dalla configurazione
            if (config.mostraLogout) {
                const logoutItem = `
                    <li class="nav-item dynamic-nav-item">
                        <a class="nav-link" href="#" onclick="logout()">
                            <i class="fas fa-sign-out-alt me-2"></i>Logout
                        </a>
                    </li>
                `;
                // Inserisci dopo Dashboard o dopo authSection se Dashboard non è presente
                let targetElement = authSection;
                if (config.mostraDashboard) {
                    // Trova l'elemento dashboard appena inserito
                    const dashboardElement = document.querySelector('.dynamic-nav-item a[href="dashboard.html"]');
                    if (dashboardElement) {
                        targetElement = dashboardElement.closest('.nav-item');
                    }
                }
                targetElement.insertAdjacentHTML('afterend', logoutItem);
            }

        } catch (error) {
            console.error('updateNavbarUniversal - Errore parsing user:', error);
            localStorage.removeItem('user');
            // Fallback: mostra navbar per utenti non autenticati
            showNavbarForUnauthenticatedUser(config);
        }
    } else {
        // Utente non autenticato
        console.log('updateNavbarUniversal - Utente non autenticato');
        showNavbarForUnauthenticatedUser(config);
    }
}

// Funzione per mostrare navbar per utenti non autenticati
function showNavbarForUnauthenticatedUser(config) {
    const authSection = document.getElementById('authSection');

    // Per la homepage, mostra sempre il tasto Accedi se l'utente non è loggato
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html' || config.mostraAccedi) {
        authSection.innerHTML = `
            <a class="nav-link btn btn-primary ms-2" href="#" onclick="showLoginModal()">
                <i class="fas fa-sign-in-alt me-1"></i>
                Accedi
            </a>
        `;
    } else {
        // Nascondi completamente la sezione auth se non serve
        authSection.style.display = 'none';
    }
}

// Funzione per inizializzare la navbar all'avvio
function initializeNavbar() {
    console.log('initializeNavbar - Inizializzazione navbar universale');

    // Verifica token all'avvio
    validateTokenOnStartup().then(() => {
        // Aggiorna navbar dopo la validazione
        updateNavbarUniversal();
    }).catch(error => {
        console.error('initializeNavbar - Errore validazione token:', error);
        // Fallback: aggiorna navbar senza validazione
        updateNavbarUniversal();
    });
}

// Esporta per uso globale
window.CONFIG = CONFIG;
window.getAuthHeaders = getAuthHeaders;
window.handleAuthError = handleAuthError;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.validateTokenOnStartup = validateTokenOnStartup;
window.isPageRequiringAuth = isPageRequiringAuth;
window.updateNavbarUniversal = updateNavbarUniversal;
window.initializeNavbar = initializeNavbar;

