-- Fix: Aggiunge constraint UNIQUE su id_prenotazione nella tabella Pagamento
-- Questo risolve l'errore "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- Prima elimina eventuali duplicati esistenti (mantiene il più recente)
DELETE FROM Pagamento p1 
WHERE EXISTS (
    SELECT 1 FROM Pagamento p2 
    WHERE p2.id_prenotazione = p1.id_prenotazione 
    AND p2.id_pagamento > p1.id_pagamento
);

-- Aggiunge il constraint UNIQUE su id_prenotazione
ALTER TABLE Pagamento 
ADD CONSTRAINT unique_id_prenotazione UNIQUE (id_prenotazione);

-- Verifica che il constraint sia stato aggiunto
SELECT conname, contype, confupdtype, confdeltype 
FROM pg_constraint 
WHERE conrelid = 'Pagamento'::regclass 
AND conname = 'unique_id_prenotazione';

