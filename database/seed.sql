-- Popolamento dati di esempio per CoWorkSpace (PostgreSQL)

-- Utenti di esempio (ignora se già esistono)
INSERT INTO Utente (nome, cognome, email, password, ruolo, telefono) VALUES
  ('Mario', 'Rossi', 'mario.rossi@email.com', '$2b$10$Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0QOQ0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0', 'gestore', '3331112222'),
  ('Luca', 'Bianchi', 'luca.bianchi@email.com', '$2b$10$Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0QOQ0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0Q0', 'cliente', '3332223333')
ON CONFLICT (email) DO NOTHING;

-- Sedi (ignora se già esistono)
INSERT INTO Sede (nome, citta, indirizzo, descrizione) VALUES
  ('CoWork Milano Centro', 'Milano', 'Via Roma 1', 'Spazi moderni in centro a Milano'),
  ('CoWork Roma Eur', 'Roma', 'Viale Europa 100', 'Coworking luminoso e attrezzato a Roma Eur')
ON CONFLICT DO NOTHING;

-- Spazi (ignora se già esistono)
INSERT INTO Spazio (id_sede, nome, tipologia, descrizione, capienza) VALUES
  (1, 'Stanza Privata 1', 'stanza privata', 'Stanza silenziosa con scrivania', 2),
  (1, 'Postazione Open Space', 'postazione', 'Postazione flessibile in open space', 1),
  (1, 'Sala Riunioni Milano', 'sala riunioni', 'Sala riunioni fino a 8 persone', 8),
  (2, 'Stanza Privata 2', 'stanza privata', 'Stanza privata con vista', 3),
  (2, 'Postazione Roma', 'postazione', 'Postazione singola in area condivisa', 1),
  (2, 'Sala Riunioni Roma', 'sala riunioni', 'Sala riunioni con schermo', 10)
ON CONFLICT DO NOTHING;

-- Servizi (ignora se già esistono)
INSERT INTO Servizio (nome, descrizione) VALUES
  ('WiFi Ultra Veloce', 'Connessione internet ad alta velocità'),
  ('Stampante', 'Accesso a stampante multifunzione'),
  ('Caffè illimitato', 'Caffè e bevande calde incluse')
ON CONFLICT DO NOTHING;

-- Associazione Spazi-Servizi (ignora se già esistono)
INSERT INTO Spazio_Servizio (id_spazio, id_servizio) VALUES
  (1, 1), (1, 2), (1, 3),
  (2, 1), (2, 3),
  (3, 1), (3, 2),
  (4, 1), (4, 2), (4, 3),
  (5, 1),
  (6, 1), (6, 2), (6, 3)
ON CONFLICT DO NOTHING; 