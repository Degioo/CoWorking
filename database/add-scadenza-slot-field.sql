-- Migration: Aggiunge campo scadenza_slot alla tabella Prenotazione
-- Questo permette di tracciare meglio quando uno slot deve essere liberato

-- Aggiunge campo scadenza_slot per tracciare quando lo slot deve essere liberato
ALTER TABLE prenotazione 
ADD COLUMN IF NOT EXISTS scadenza_slot TIMESTAMP;

-- Crea indice per ottimizzare le query di scadenza
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_prenotazione_scadenza_slot'
    ) THEN
        CREATE INDEX idx_prenotazione_scadenza_slot 
        ON prenotazione(scadenza_slot) 
        WHERE stato IN ('in attesa', 'pendente');
    END IF;
END $$;

-- Verifica che il campo sia stato aggiunto
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'prenotazione' 
AND column_name = 'scadenza_slot';
