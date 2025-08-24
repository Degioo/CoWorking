-- Fix: Aggiorna constraint prenotazione_stato_check per includere stato 'cancellata'
-- Questo script risolve l'errore "violates check constraint prenotazione_stato_check"

-- Rimuovi il constraint esistente
ALTER TABLE Prenotazione DROP CONSTRAINT IF EXISTS prenotazione_stato_check;

-- Aggiungi il nuovo constraint con tutti gli stati validi
ALTER TABLE Prenotazione ADD CONSTRAINT prenotazione_stato_check 
    CHECK (stato IN ('pendente', 'in attesa', 'confermata', 'annullata', 'completata', 'pagamento_fallito', 'scaduta', 'cancellata'));

-- Verifica che il constraint sia stato creato correttamente
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'prenotazione_stato_check';

-- Mostra tutti gli stati attualmente presenti nella tabella
SELECT DISTINCT stato, COUNT(*) as conteggio
FROM Prenotazione 
GROUP BY stato 
ORDER BY stato;
