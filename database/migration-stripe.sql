-- Migrazione per aggiungere supporto Stripe
-- Esegui questo script se hai già un database esistente

-- Aggiungi campo stripe_customer_id alla tabella Utente
ALTER TABLE Utente ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Aggiungi campo stripe_payment_intent_id alla tabella Pagamento
ALTER TABLE Pagamento ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE;

-- Aggiungi campo data_pagamento alla tabella Prenotazione
ALTER TABLE Prenotazione ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;

-- Aggiorna i vincoli CHECK per la tabella Prenotazione
ALTER TABLE Prenotazione DROP CONSTRAINT IF EXISTS prenotazione_stato_check;
ALTER TABLE Prenotazione ADD CONSTRAINT prenotazione_stato_check 
    CHECK (stato IN ('pendente', 'in attesa', 'confermata', 'annullata', 'completata', 'pagamento_fallito', 'scaduta', 'cancellata'));

-- Aggiorna i vincoli CHECK per la tabella Pagamento
ALTER TABLE Pagamento DROP CONSTRAINT IF EXISTS pagamento_stato_check;
ALTER TABLE Pagamento ADD CONSTRAINT pagamento_stato_check 
    CHECK (stato IN ('pagato', 'in attesa', 'rimborsato', 'fallito', 'in sospeso'));

-- Crea indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_utente_stripe_customer_id ON Utente(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pagamento_stripe_payment_intent_id ON Pagamento(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_prenotazione_stato ON Prenotazione(stato);
CREATE INDEX IF NOT EXISTS idx_prenotazione_data_pagamento ON Prenotazione(data_pagamento);
