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
        // ✅ Aggiorna la navbar per mostrare il tasto Accedi
        console.log('logout - Aggiorno navbar per utente non autenticato');
        updateNavbarUniversal();
    }

}

// ✅ NUOVA FUNZIONE: tenta di ripristinare i dati utente dal token
async function attemptUserRestoreFromToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('attemptUserRestoreFromToken - Nessun token disponibile');
        return false;
    }

    try {
        console.log('🔄 Tentativo di ripristino dati utente dal token...');

        // Prova a decodificare il JWT per estrarre informazioni base
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            try {
                const payload = JSON.parse(atob(tokenParts[1]));
                console.log('🔍 Payload token decodificato:', payload);

                // Se il token contiene dati utente, ricrea l'oggetto user
                if (payload.id_utente || payload.sub) {
                    const restoredUser = {
                        id_utente: payload.id_utente || payload.sub,
                        nome: payload.nome || 'Utente',
                        cognome: payload.cognome || 'Ripristinato',
                        email: payload.email || 'email@example.com',
                        ruolo: payload.ruolo || 'cliente',
                        message: 'Utente ripristinato dal token'
                    };

                    console.log('✅ Dati utente ripristinati dal token:', restoredUser);
                    localStorage.setItem('user', JSON.stringify(restoredUser));
                    return true;
                }
            } catch (decodeError) {
                console.log('⚠️ Errore decodifica payload token:', decodeError);
            }
        }

        // Se non riesco a decodificare, prova a chiamare l'API per verificare il token
        console.log('🔄 Tentativo verifica token tramite API...');
        const response = await fetch(`${window.CONFIG.API_BASE}/verify-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'token': token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Dati utente ripristinati tramite API:', userData);
            localStorage.setItem('user', JSON.stringify(userData));
            return true;
        } else {
            console.log('⚠️ API verify-token non disponibile o fallita');
            return false;
        }

    } catch (error) {
        console.error('❌ Errore nel tentativo di ripristino dati utente:', error);
        return false;
    }
}

// Funzione per verificare se l'utente è autenticato
async function isAuthenticated() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!user && token) {
        // ✅ NUOVO CASO: token presente ma user mancante, prova a ripristinare
        console.log('isAuthenticated - Token presente ma user mancante, tentativo di ripristino...');
        const restored = await attemptUserRestoreFromToken();
        if (restored) {
            console.log('isAuthenticated - User ripristinato con successo');
            return true;
        }
    }

    if (!user) {
        console.log('isAuthenticated - User mancante');
        return false;
    }

    try {
        const userData = JSON.parse(user);

        // ✅ Se l'utente è gestore o amministratore, mantieni la sessione anche senza token
        if (userData.ruolo === 'gestore' || userData.ruolo === 'amministratore') {
            if (userData.id_utente) {
                console.log('isAuthenticated - Gestore/amministratore autenticato (token opzionale):', userData.nome, userData.cognome);
                return true;
            }
        }

        // ✅ Per utenti normali, richiedi sia user che token
        if (!token) {
            console.log('isAuthenticated - User presente ma token mancante per utente normale:', userData?.nome, userData?.cognome);
            return false;
        }

        const isAuthenticated = userData && userData.id_utente;
        console.log('isAuthenticated - Risultato:', isAuthenticated, 'per utente:', userData?.nome, userData?.cognome);
        return isAuthenticated;
    } catch (error) {
        console.error('isAuthenticated - Errore parsing user:', error);
        return false;
    }
}

// Funzione per verificare e ripristinare il token mancante
function checkAndRestoreToken() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    console.log('checkAndRestoreToken - Verifica token:', { user: !!user, token: !!token });

    if (user && !token) {
        console.log('⚠️ Token mancante ma user presente, tentativo di ripristino...');

        try {
            const userData = JSON.parse(user);

            // Se l'utente ha un messaggio di login, potrebbe essere necessario un nuovo login
            if (userData.message === 'Login effettuato') {
                console.log('🔐 Rilevato utente con messaggio di login ma senza token, richiedo nuovo login');
                localStorage.removeItem('user'); // Rimuovi dati corrotti
                return false;
            }

            // Se l'utente ha tutti i campi necessari ma manca il token, potrebbe essere un bug
            if (userData.id_utente && userData.nome && userData.cognome) {
                console.log('⚠️ Utente valido ma token mancante, potrebbe essere un bug del sistema');
                // ✅ NON rimuovere l'utente, potrebbe essere un problema temporaneo
                // ✅ Restituisci true per mantenere la sessione attiva
                return true;
            }
        } catch (error) {
            console.error('checkAndRestoreToken - Errore parsing user:', error);
            localStorage.removeItem('user');
            return false;
        }
    }

    return true;
}

// Funzione per forzare un nuovo login se necessario
function forceReLogin(reason = 'Token mancante o non valido') {
    console.log('🔄 Forzo nuovo login:', reason);

    // Pulisci tutti i dati di sessione
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('redirectAfterLogin');

    // Reindirizza al login con messaggio
    const loginUrl = 'login.html?message=' + encodeURIComponent(`Errore di autenticazione: ${reason}. Effettua nuovamente il login.`);
    window.location.href = loginUrl;
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
    } else if (user && !token) {
        // Caso speciale: user presente ma token mancante
        console.log('validateTokenOnStartup - User presente ma token mancante, verifico integrità...');

        try {
            const userData = JSON.parse(user);
            // ✅ Se l'utente è gestore o amministratore, mantieni la sessione anche senza token
            if (userData.ruolo === 'gestore' || userData.ruolo === 'amministratore') {
                console.log('🎯 Utente gestore/amministratore, mantengo sessione anche senza token');
                return true;
            }
        } catch (error) {
            console.log('validateTokenOnStartup - Errore parsing user per controllo ruolo:', error);
        }

        return checkAndRestoreToken();
    } else if (!user && token) {
        // ✅ NUOVO CASO: token presente ma user mancante (situazione attuale)
        console.log('⚠️ validateTokenOnStartup - Token presente ma user mancante, tentativo di ripristino...');

        // Prova a ripristinare i dati utente dal token
        return await attemptUserRestoreFromToken();
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

    // La pagina selezione-slot.html richiede autenticazione per completare la prenotazione
    if (pageName === 'selezione-slot.html') {
        // Controlla se c'è una prenotazione in corso
        const hasPrenotazioneInCorso = localStorage.getItem('selectedSede') ||
            localStorage.getItem('selectedSpazio') ||
            localStorage.getItem('selectedDataInizio') ||
            localStorage.getItem('selectedDataFine');
        // Se c'è una prenotazione in corso, richiede autenticazione
        return hasPrenotazioneInCorso;
    }

    return pagesRequiringAuth.includes(pageName);
}

// Funzione per verificare se un utente può accedere a una pagina specifica
function canUserAccessPage(pageName, userRole) {
    // I gestori e amministratori non possono accedere alla pagina di selezione slot
    if (pageName === 'selezione-slot.html' && (userRole === 'gestore' || userRole === 'amministratore')) {
        return false;
    }

    // I gestori e amministratori non possono accedere alla pagina di pagamento
    if (pageName === 'pagamento.html' && (userRole === 'gestore' || userRole === 'amministratore')) {
        return false;
    }

    return true;
}

// ===== NAVBAR UNIVERSALE =====
// Sistema centralizzato per gestire la navbar in tutte le pagine

// Configurazione navbar per diverse pagine
const NAVBAR_CONFIG = {
    // Pagina: { mostraDashboard: boolean, mostraLogout: boolean, mostraPrenota: boolean }
    'index.html': { mostraDashboard: true, mostraLogout: true, mostraPrenota: true },
    'selezione-slot.html': { mostraDashboard: true, mostraLogout: true, mostraPrenota: true },
    'catalogo.html': { mostraDashboard: true, mostraLogout: true, mostraPrenota: true },
    'pagamento.html': { mostraDashboard: true, mostraLogout: true, mostraPrenota: false },
    'dashboard.html': { mostraDashboard: false, mostraLogout: true, mostraPrenota: true },
    'dashboard-responsabili.html': { mostraDashboard: false, mostraLogout: true, mostraPrenota: false }
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
    console.log('updateNavbarUniversal - Configurazione: Dashboard=' + config.mostraDashboard + ', Logout=' + config.mostraLogout + ', Prenota=' + config.mostraPrenota);

    // Trova la sezione auth
    const authSection = document.getElementById('authSection');
    if (!authSection) {
        console.log('updateNavbarUniversal - Sezione auth non trovata, navbar non aggiornata');
        return;
    }

    // ✅ Rimuovi tutti gli elementi dinamici esistenti per evitare duplicati
    console.log('🧹 Pulizia elementi dinamici esistenti...');

    // Rimuovi link dinamici (Dashboard, etc.)
    document.querySelectorAll('.nav-item.dynamic-nav-item').forEach(item => {
        item.remove();
        console.log('🗑️ Rimosso elemento dinamico:', item.textContent?.trim());
    });

    // ✅ Info utente non più gestito, navbar più pulita

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('updateNavbarUniversal - Utente autenticato:', user.nome, user.cognome);

            // ✅ Trasforma il tasto "Accedi" esistente in "Logout" mantenendo lo stesso stile
            console.log('🔍 Cercando tasto Accedi nella sezione auth...');
            const accediButton = authSection.querySelector('.btn-primary');
            console.log('🔍 Tasto Accedi trovato:', accediButton);

            if (accediButton) {
                // ✅ Trasforma il tasto Accedi in Logout
                console.log('🔄 Trasformo tasto Accedi in Logout...');
                accediButton.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
                accediButton.onclick = logout;
                accediButton.href = '#';
                console.log('✅ Tasto Accedi trasformato in Logout');
            } else {
                // Fallback: crea nuovo pulsante Logout se non trova quello esistente
                console.log('⚠️ Tasto Accedi non trovato, creo nuovo pulsante Logout');
                authSection.innerHTML = `
                    <a class="nav-link btn btn-primary" href="#" onclick="logout()">
                        <i class="fas fa-sign-out-alt me-1"></i>Logout
                    </a>
                `;
            }

                        // ✅ Info utente rimosso per navbar più pulita
            console.log('✅ Navbar pulita senza info utente');

            // Aggiungi Dashboard se richiesto dalla configurazione
            if (config.mostraDashboard) {
                const dashboardItem = `
                    <li class="nav-item dynamic-nav-item">
                        <a class="nav-link" href="dashboard.html">
                            <i class="fas fa-tachometer-alt me-2"></i>Dashboard (${user.nome})
                        </a>
                    </li>
                `;
                authSection.insertAdjacentHTML('afterend', dashboardItem);
            }

            // Aggiungi Dashboard Gestore per gestori e amministratori
            if (user.ruolo === 'gestore' || user.ruolo === 'amministratore') {
                const dashboardGestoreItem = `
                    <li class="nav-item dynamic-nav-item">
                        <a class="nav-link" href="dashboard-responsabili.html">
                            <i class="fas fa-users-cog me-2"></i>Dashboard Responsabili
                        </a>
                    </li>
                `;
                // Inserisci dopo Dashboard o dopo authSection se Dashboard non è presente
                let targetElement = authSection;
                if (config.mostraDashboard) {
                    const dashboardElement = document.querySelector('.dynamic-nav-item a[href="dashboard.html"]');
                    if (dashboardElement) {
                        targetElement = dashboardElement.closest('.nav-item');
                    }
                }
                targetElement.insertAdjacentHTML('afterend', dashboardGestoreItem);
            }

            // ✅ Logout ora è integrato direttamente nella sezione auth (vedi sopra)
            // Non serve più aggiungere un pulsante Logout separato

            // Gestisci la visibilità del link "Prenota" in base al ruolo
            managePrenotaLinkVisibility(user.ruolo);

            console.log('✅ updateNavbarUniversal - Navbar aggiornata per utente autenticato');

        } catch (error) {
            console.error('updateNavbarUniversal - Errore parsing user:', error);
            localStorage.removeItem('user');
            // Fallback: mostra navbar per utenti non autenticati
            console.log('⚠️ updateNavbarUniversal - Fallback a navbar non autenticata');
            showNavbarForUnauthenticatedUser(config);
        }
    } else {
        // Utente non autenticato
        console.log('updateNavbarUniversal - Utente non autenticato');
        showNavbarForUnauthenticatedUser(config);
    }
}

// Funzione per gestire la visibilità del link "Prenota" in base al ruolo
function managePrenotaLinkVisibility(userRole) {
    // Trova tutti i link "Prenota" nella navbar
    const prenotaLinks = document.querySelectorAll('a[href="selezione-slot.html"]');

    prenotaLinks.forEach(link => {
        // Se l'utente è gestore o amministratore, nascondi il link Prenota
        if (userRole === 'gestore' || userRole === 'amministratore') {
            link.style.display = 'none';
            // Nascondi anche l'elemento padre se è un nav-item
            const navItem = link.closest('.nav-item');
            if (navItem) {
                navItem.style.display = 'none';
            }
        } else {
            // Per utenti normali, mostra il link
            link.style.display = 'inline-block';
            const navItem = link.closest('.nav-item');
            if (navItem) {
                navItem.style.display = 'block';
            }
        }
    });

    // Gestisci anche i pulsanti "Prenota Ora" nelle pagine
    managePrenotaButtonsVisibility(userRole);
}

// Funzione per gestire la visibilità dei pulsanti "Prenota Ora" in base al ruolo
function managePrenotaButtonsVisibility(userRole) {
    // Se l'utente è gestore o amministratore, nascondi i pulsanti di prenotazione
    if (userRole === 'gestore' || userRole === 'amministratore') {
        console.log('🎯 Gestore/amministratore rilevato, nascondo pulsanti prenotazione');

        // ✅ Metodo corretto: cerca pulsanti con testo specifico
        const allButtons = document.querySelectorAll('button, .btn');
        let hiddenCount = 0;

        allButtons.forEach(button => {
            if (button.textContent && button.textContent.includes('Prenota Ora')) {
                button.style.display = 'none';
                hiddenCount++;
                console.log('🚫 Pulsante nascosto:', button.textContent.trim());
            }
        });

        // Nascondi anche i pulsanti con ID specifici
        const btnBook = document.getElementById('btnBook');
        if (btnBook) {
            btnBook.style.display = 'none';
            hiddenCount++;
            console.log('🚫 Pulsante btnBook nascosto');
        }

        console.log(`✅ Gestione pulsanti completata: ${hiddenCount} pulsanti nascosti`);
    } else {
        console.log('👤 Utente normale, pulsanti prenotazione visibili');
    }
}

// Funzione per mostrare navbar per utenti non autenticati
function showNavbarForUnauthenticatedUser(config) {
    console.log('🔄 showNavbarForUnauthenticatedUser chiamata');

    // ✅ CONTROLLO: verifica se l'utente è effettivamente autenticato
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('⚠️ showNavbarForUnauthenticatedUser: utente già autenticato, non mostro navbar non autenticata');
            console.log('⚠️ Utente autenticato:', userData.nome, userData.cognome, userData.ruolo);
            return; // Non mostrare navbar non autenticata se l'utente è già loggato
        } catch (error) {
            console.log('⚠️ showNavbarForUnauthenticatedUser: errore parsing user, procedo con navbar non autenticata');
        }
    }

    const authSection = document.getElementById('authSection');
    if (!authSection) {
        console.log('❌ showNavbarForUnauthenticatedUser: authSection non trovata');
        return;
    }

    // ✅ Mostra sempre il tasto Accedi per utenti non autenticati (soprattutto sulla homepage)
    console.log('✅ showNavbarForUnauthenticatedUser: mostro tasto Accedi');

        // ✅ Rimuovi elementi dinamici rimasti per navbar pulita
    console.log('🧹 Pulizia elementi dinamici...');
    
    // Rimuovi eventuali link dinamici rimasti
    const dynamicItems = authSection.parentElement.querySelectorAll('.dynamic-nav-item');
    dynamicItems.forEach(item => {
        item.remove();
        console.log('🗑️ Rimosso elemento dinamico rimasto:', item.textContent?.trim());
    });

    // ✅ Mostra tasto Accedi
    authSection.innerHTML = `
        <a class="nav-link btn btn-primary ms-2" href="#" onclick="showLoginModal()">
            <i class="fas fa-sign-in-alt me-1"></i>
            Accedi
        </a>
    `;
    console.log('✅ Tasto Accedi mostrato, navbar pulita');
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
window.forceReLogin = forceReLogin;

