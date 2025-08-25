const pool = require('../config/database');

// Gestisce lo stato di concorrenza per uno spazio specifico
exports.getStatoConcorrenza = async (req, res) => {
    const { id } = req.params;

    try {
        console.log('🔄 Controllo concorrenza per spazio:', id);

        // Recupera stato attuale dello spazio
        const spazioResult = await pool.query(
            `SELECT stato, ultima_prenotazione, utente_prenotazione 
             FROM Spazio 
             WHERE id_spazio = $1`,
            [id]
        );

        if (spazioResult.rows.length === 0) {
            return res.status(404).json({ error: 'Spazio non trovato' });
        }

        const spazio = spazioResult.rows[0];

        // Recupera tutte le prenotazioni attive per questo spazio
        const prenotazioniResult = await pool.query(
            `SELECT p.id_prenotazione, p.id_utente, p.data_inizio, p.data_fine, 
                    p.stato, p.scadenza_slot, p.created_at,
                    u.nome, u.cognome
             FROM Prenotazione p
             JOIN Utente u ON p.id_utente = u.id_utente
             WHERE p.id_spazio = $1 
               AND (p.stato = 'confermata' OR p.stato = 'in attesa')
               AND p.data_inizio >= CURRENT_DATE
             ORDER BY p.data_inizio ASC`,
            [id]
        );

        const prenotazioni = prenotazioniResult.rows;
        console.log('📋 Prenotazioni trovate:', prenotazioni.length);

        // Genera stato concorrenza per ogni slot orario
        const statoConcorrenza = {
            spazio: {
                id: parseInt(id),
                stato: spazio.stato,
                ultima_prenotazione: spazio.ultima_prenotazione,
                utente_prenotazione: spazio.utente_prenotazione
            },
            slot: {},
            timestamp: new Date().toISOString()
        };

        // Orari di apertura (9:00 - 17:00)
        const orariApertura = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

        orariApertura.forEach(orario => {
            const [ora] = orario.split(':');
            const slotDate = new Date();
            slotDate.setHours(parseInt(ora), 0, 0, 0);

            // Trova prenotazioni che coprono questo slot
            const prenotazioniSlot = prenotazioni.filter(p => {
                const dataInizio = new Date(p.data_inizio);
                const dataFine = new Date(p.data_fine);
                return slotDate >= dataInizio && slotDate < dataFine;
            });

            if (prenotazioniSlot.length === 0) {
                // Slot disponibile
                statoConcorrenza.slot[orario] = {
                    stato: 'disponibile',
                    motivo: 'Libero',
                    timestamp: new Date().toISOString()
                };
            } else {
                const prenotazione = prenotazioniSlot[0];

                if (prenotazione.stato === 'confermata') {
                    // Slot prenotato e pagato
                    statoConcorrenza.slot[orario] = {
                        stato: 'prenotato_confermato',
                        motivo: `Prenotato da ${prenotazione.nome} ${prenotazione.cognome}`,
                        id_prenotazione: prenotazione.id_prenotazione,
                        timestamp: new Date().toISOString()
                    };
                } else if (prenotazione.stato === 'in attesa') {
                    // Controlla se è scaduta
                    const scadenza = new Date(prenotazione.scadenza_slot);
                    const ora = new Date();

                    if (ora > scadenza) {
                        // Slot scaduto, disponibile
                        statoConcorrenza.slot[orario] = {
                            stato: 'disponibile',
                            motivo: 'Liberato da prenotazione scaduta',
                            timestamp: new Date().toISOString()
                        };
                    } else {
                        // Slot occupato temporaneamente
                        const tempoRimanente = Math.ceil((scadenza - ora) / 1000);
                        statoConcorrenza.slot[orario] = {
                            stato: 'occupato_temporaneo',
                            motivo: `Occupato da ${prenotazione.nome} ${prenotazione.cognome}`,
                            id_prenotazione: prenotazione.id_prenotazione,
                            scadenza: scadenza.toISOString(),
                            tempo_rimanente: tempoRimanente,
                            timestamp: new Date().toISOString()
                        };
                    }
                }
            }
        });

        console.log('✅ Stato concorrenza generato per', Object.keys(statoConcorrenza.slot).length, 'slot');
        res.json(statoConcorrenza);

    } catch (err) {
        console.error('❌ Errore gestione concorrenza:', err);
        res.status(500).json({ error: 'Errore server: ' + err.message });
    }
};
