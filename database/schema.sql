-- Schema SQL per CoWorkSpace (PostgreSQL)

CREATE TABLE IF NOT EXISTS Utente (
    id_utente SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    ruolo TEXT NOT NULL CHECK (ruolo IN ('cliente', 'gestore', 'amministratore')),
    telefono TEXT,
    stripe_customer_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS Sede (
    id_sede SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    citta TEXT NOT NULL,
    indirizzo TEXT NOT NULL,
    descrizione TEXT,
    id_gestore INTEGER REFERENCES Utente(id_utente)
);

CREATE TABLE IF NOT EXISTS Spazio (
    id_spazio SERIAL PRIMARY KEY,
    id_sede INTEGER NOT NULL REFERENCES Sede(id_sede),
    nome TEXT NOT NULL,
    tipologia TEXT NOT NULL CHECK (tipologia IN ('stanza privata', 'postazione', 'sala riunioni')),
    descrizione TEXT,
    capienza INTEGER
);

CREATE TABLE IF NOT EXISTS Servizio (
    id_servizio SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    descrizione TEXT
);

CREATE TABLE IF NOT EXISTS Spazio_Servizio (
    id_spazio INTEGER NOT NULL REFERENCES Spazio(id_spazio),
    id_servizio INTEGER NOT NULL REFERENCES Servizio(id_servizio),
    PRIMARY KEY (id_spazio, id_servizio)
);

CREATE TABLE IF NOT EXISTS Prenotazione (
    id_prenotazione SERIAL PRIMARY KEY,
    id_utente INTEGER NOT NULL REFERENCES Utente(id_utente),
    id_spazio INTEGER NOT NULL REFERENCES Spazio(id_spazio),
    data_inizio TIMESTAMP NOT NULL,
    data_fine TIMESTAMP NOT NULL,
    stato TEXT NOT NULL CHECK (stato IN ('pendente', 'in attesa', 'confermata', 'annullata', 'completata', 'pagamento_fallito', 'scaduta', 'cancellata')),
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scadenza_slot TIMESTAMP,
    data_pagamento TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Pagamento (
    id_pagamento SERIAL PRIMARY KEY,
    id_prenotazione INTEGER NOT NULL REFERENCES Prenotazione(id_prenotazione),
    importo NUMERIC(10,2) NOT NULL,
    data_pagamento TIMESTAMP NOT NULL,
    stato TEXT NOT NULL CHECK (stato IN ('pagato', 'in attesa', 'rimborsato', 'fallito', 'in sospeso')),
    -- estensioni provider
    metodo TEXT,
    provider TEXT,
    provider_payment_id TEXT UNIQUE,
    currency TEXT,
    receipt_url TEXT,
    stripe_payment_intent_id TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
); 