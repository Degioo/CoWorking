const pool = require('../db');

async function getDisponibilitaSlot(req, res) {
    try {
        const { id_spazio } = req.params;
        const { data } = req.params;

        console.log(`🔍 Richiesta disponibilità slot per spazio ${id_spazio} e data ${data}`);

        // Verifica che lo spazio esista
        const spazioQuery = 'SELECT * FROM Spazio WHERE id_spazio = $1';
        const spazioResult = await pool.query(spazioQuery, [id_spazio]);

        if (spazioResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Spazio non trovato'
            });
        }

        const spazio = spazioResult.rows[0];

        // Ottieni orari di apertura (9:00 - 18:00)
        const orariApertura = [];
        for (let hour = 9; hour <= 17; hour++) {
            orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
        }

        // Ottieni prenotazioni esistenti per questa data
        const prenotazioniQuery = `
            SELECT 
                p.orario_inizio,
                p.orario_fine,
                p.stato,
                p.data_creazione,
                EXTRACT(EPOCH FROM (p.data_creazione + INTERVAL '15 minutes' - NOW()))/60 as minuti_rimanenti
            FROM Prenotazione p
            WHERE p.id_spazio = $1 
            AND p.data_inizio::date = $2::date
            AND p.stato IN ('confermata', 'in_attesa_pagamento')
        `;

        const prenotazioniResult = await pool.query(prenotazioniQuery, [id_spazio, data]);
        const prenotazioni = prenotazioniResult.rows;

        // Crea array con stato di ogni slot
        const slotsStatus = orariApertura.map((orario, index) => {
            const slotId = index + 1;
            const orarioHour = parseInt(orario.split(':')[0]);
            const now = new Date();
            const selectedDate = new Date(data);
            
            // Controlla se l'orario è passato
            if (selectedDate.toDateString() === now.toDateString() && orarioHour <= now.getHours()) {
                return {
                    id_slot: slotId,
                    orario: orario,
                    status: 'past',
                    title: 'Orario passato'
                };
            }

            // Controlla se c'è una prenotazione per questo orario
            const prenotazione = prenotazioni.find(p => {
                const prenotazioneInizio = parseInt(p.orario_inizio.split(':')[0]);
                const prenotazioneFine = parseInt(p.orario_fine.split(':')[0]);
                return orarioHour >= prenotazioneInizio && orarioHour < prenotazioneFine;
            });

            if (prenotazione) {
                if (prenotazione.stato === 'confermata') {
                    return {
                        id_slot: slotId,
                        orario: orario,
                        status: 'booked',
                        title: 'Slot prenotato'
                    };
                } else if (prenotazione.stato === 'in_attesa_pagamento') {
                    const minutiRimanenti = Math.max(0, Math.floor(prenotazione.minuti_rimanenti));
                    return {
                        id_slot: slotId,
                        orario: orario,
                        status: 'occupied',
                        title: `Slot occupato (hold scade in ${minutiRimanenti} min)`,
                        hold_time_remaining: minutiRimanenti
                    };
                }
            }

            // Slot disponibile
            return {
                id_slot: slotId,
                orario: orario,
                status: 'available',
                title: 'Slot disponibile'
            };
        });

        console.log(`✅ Disponibilità slot calcolata: ${slotsStatus.length} slot`);

        res.json({
            success: true,
            data: {
                spazio: {
                    id: spazio.id_spazio,
                    nome: spazio.nome
                },
                data: data,
                slots: slotsStatus
            }
        });

    } catch (error) {
        console.error('❌ Errore nel calcolo disponibilità slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel calcolo disponibilità slot'
        });
    }
}

module.exports = {
    getDisponibilitaSlot
};



