-- SCRIPT SQL PER CONTROLLARE PRENOTAZIONI SU SUPABASE
-- Esegui questo script su Supabase per capire perché lo spazio risulta "occupato"

-- 1. Controlla lo stato dello spazio
SELECT 
    id_spazio,
    nome,
    stato,
    ultima_prenotazione,
    utente_prenotazione
FROM Spazio 
WHERE id_spazio = 1; -- Cambia con l'ID dello spazio che stai testando

-- 2. Controlla tutte le prenotazioni per lo spazio
SELECT 
    p.id_prenotazione,
    p.id_utente,
    p.id_spazio,
    p.data_inizio,
    p.data_fine,
    p.stato,
    p.scadenza_slot,
    u.nome,
    u.cognome,
    s.nome AS nome_spazio
FROM Prenotazione p
JOIN Utente u ON p.id_utente = u.id_utente
JOIN Spazio s ON p.id_spazio = s.id_spazio
WHERE p.id_spazio = 1 -- Cambia con l'ID dello spazio che stai testando
ORDER BY p.data_inizio DESC;

-- 3. Controlla prenotazioni per una data specifica (26 Agosto 2025)
SELECT 
    p.id_prenotazione,
    p.id_utente,
    p.id_spazio,
    p.data_inizio,
    p.data_fine,
    p.stato,
    p.scadenza_slot,
    u.nome,
    u.cognome
FROM Prenotazione p
JOIN Utente u ON p.id_utente = u.id_utente
WHERE p.id_spazio = 1 -- Cambia con l'ID dello spazio
  AND DATE(p.data_inizio) = '2025-08-26' -- Cambia con la data che stai testando
ORDER BY p.data_inizio;

-- 4. Controlla se ci sono prenotazioni sovrapposte per un intervallo specifico
-- (es. dalle 09:00 alle 12:00 del 26 Agosto 2025)
SELECT 
    p.id_prenotazione,
    p.id_utente,
    p.id_spazio,
    p.data_inizio,
    p.data_fine,
    p.stato,
    u.nome,
    u.cognome
FROM Prenotazione p
JOIN Utente u ON p.id_utente = u.id_utente
WHERE p.id_spazio = 1 -- Cambia con l'ID dello spazio
  AND (
    (p.data_inizio < '2025-08-26T12:00:00' AND p.data_fine > '2025-08-26T09:00:00')
    OR
    (p.data_inizio >= '2025-08-26T09:00:00' AND p.data_inizio < '2025-08-26T12:00:00')
  )
ORDER BY p.data_inizio;

-- 5. Controlla prenotazioni scadute che potrebbero bloccare lo spazio
SELECT 
    p.id_prenotazione,
    p.id_utente,
    p.id_spazio,
    p.data_inizio,
    p.data_fine,
    p.stato,
    p.scadenza_slot,
    u.nome,
    u.cognome,
    CASE 
        WHEN p.scadenza_slot < NOW() THEN 'SCADUTA'
        ELSE 'ATTIVA'
    END AS stato_scadenza
FROM Prenotazione p
JOIN Utente u ON p.id_utente = u.id_utente
WHERE p.id_spazio = 1 -- Cambia con l'ID dello spazio
  AND p.stato = 'in attesa'
ORDER BY p.scadenza_slot DESC;
