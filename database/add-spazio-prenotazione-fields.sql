-- Migration: Aggiunge campi per gestione prenotazioni alla tabella Spazio
-- Questo permette di bloccare temporaneamente gli slot durante la prenotazione

-- Aggiunge campo stato per gestire disponibilità slot
ALTER TABLE Spazio 
ADD COLUMN IF NOT EXISTS stato TEXT DEFAULT 'disponibile' CHECK (stato IN ('disponibile', 'occupato', 'in_prenotazione', 'manutenzione'));

-- Aggiunge campo per tracciare l'ultima prenotazione
ALTER TABLE Spazio 
ADD COLUMN IF NOT EXISTS ultima_prenotazione TIMESTAMP;

-- Aggiunge campo per tracciare chi sta prenotando
ALTER TABLE Spazio 
ADD COLUMN IF NOT EXISTS utente_prenotazione INTEGER REFERENCES Utente(id_utente);

-- Crea indice per ottimizzare le query di scadenza
CREATE INDEX IF NOT EXISTS idx_spazio_stato_ultima_prenotazione 
ON Spazio(stato, ultima_prenotazione) 
WHERE stato = 'in_prenotazione';

-- Aggiorna tutti gli spazi esistenti a 'disponibile'
UPDATE Spazio SET stato = 'disponibile' WHERE stato IS NULL;

-- Verifica che i campi siano stati aggiunti
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'spazio' 
AND column_name IN ('stato', 'ultima_prenotazione', 'utente_prenotazione')
ORDER BY column_name;
