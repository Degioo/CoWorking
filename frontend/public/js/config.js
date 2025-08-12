// Configurazione API - Aggiorna questi valori con i tuoi dati Supabase
const CONFIG = {
    // Sostituisci con il tuo URL Supabase
    SUPABASE_URL: 'https://your-project.supabase.co',

    // Sostituisci con la tua API Key pubblica di Supabase
    SUPABASE_ANON_KEY: 'your-supabase-anon-key-here',

    // Base URL per le API (se usi Supabase Edge Functions)
    API_BASE: 'https://your-project.supabase.co/functions/v1',

    // Fallback per sviluppo locale (commenta se usi solo Supabase)
    // API_BASE: 'http://localhost:3002/api'
};

// Esporta per uso globale
window.CONFIG = CONFIG;

