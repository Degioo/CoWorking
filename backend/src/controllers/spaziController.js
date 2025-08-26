const pool = require('../db');

async function getDisponibilitaSlot(req, res) {
    try {
        console.log('🚀 getDisponibilitaSlot chiamato');
        console.log('📋 Request params:', req.params);
        console.log('📋 Request query:', req.query);

        const { id_spazio } = req.params;
        const { data } = req.params;

        console.log(`🔍 Richiesta disponibilità slot per spazio ${id_spazio} e data ${data}`);

        // Validazione parametri
        if (!id_spazio || !data) {
            return res.status(400).json({
                success: false,
                error: 'Parametri mancanti: id_spazio e data sono richiesti'
            });
        }

        // Verifica che lo spazio esista
        const spazioQuery = 'SELECT id_spazio, nome FROM Spazio WHERE id_spazio = $1';
        const spazioResult = await pool.query(spazioQuery, [id_spazio]);

        if (spazioResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Spazio non trovato'
            });
        }

        const spazio = spazioResult.rows[0];
        console.log(`✅ Spazio trovato: ${spazio.nome}`);

        // Ottieni orari di apertura (9:00 - 18:00)
        const orariApertura = [];
        for (let hour = 9; hour <= 17; hour++) {
            orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
        }

        console.log(`⏰ Orari apertura generati: ${orariApertura.length} slot`);

        // Ottieni prenotazioni esistenti per questa data (query semplificata)
        let prenotazioni = [];
        try {
            const prenotazioniQuery = `
                SELECT 
                    orario_inizio,
                    orario_fine,
                    stato
                FROM Prenotazione 
                WHERE id_spazio = $1 
                AND DATE(data_inizio) = $2
                AND stato IN ('confermata', 'in_attesa_pagamento')
            `;

            const prenotazioniResult = await pool.query(prenotazioniQuery, [id_spazio, data]);
            prenotazioni = prenotazioniResult.rows;
            console.log(`📋 Prenotazioni trovate: ${prenotazioni.length}`);
        } catch (queryError) {
            console.warn('⚠️ Errore query prenotazioni, continuo senza:', queryError.message);
            prenotazioni = [];
        }

        // Crea array con stato di ogni slot
        const slotsStatus = orariApertura.map((orario, index) => {
            const slotId = index + 1;
            const orarioHour = parseInt(orario.split(':')[0]);
            const now = new Date();
            const selectedDate = new Date(data);

            // Controlla se l'orario è passato (solo per oggi)
            if (selectedDate.toDateString() === now.toDateString() && orarioHour <= now.getHours()) {
                console.log(`⏰ Slot ${slotId} (${orario}) marcato come PASSATO - ora corrente: ${now.getHours()}:00`);
                return {
                    id_slot: slotId,
                    orario: orario,
                    status: 'past',
                    title: 'Orario passato'
                };
            }

            // Controlla se c'è una prenotazione per questo orario
            const prenotazione = prenotazioni.find(p => {
                if (!p.orario_inizio || !p.orario_fine) return false;

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
                    return {
                        id_slot: slotId,
                        orario: orario,
                        status: 'occupied',
                        title: 'Slot occupato (in attesa pagamento)',
                        hold_time_remaining: 15
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
        console.error('Stack trace:', error.stack);

        res.status(500).json({
            success: false,
            error: 'Errore nel calcolo disponibilità slot',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Errore interno del server'
        });
    }
}

// Endpoint di test semplice
async function testEndpoint(req, res) {
    try {
        console.log('🧪 Test endpoint chiamato');
        res.json({
            success: true,
            message: 'Test endpoint funziona',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Errore test endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Errore test endpoint'
        });
    }
}

// Endpoint di test per simulare prenotazioni
async function testSimulateBookings(req, res) {
    try {
        console.log('🧪 Test simulazione prenotazioni chiamato');
        
        // Simula alcune prenotazioni per test
        const testBookings = [
            {
                id_slot: 1,
                orario: '09:00',
                status: 'booked',
                title: 'Slot prenotato (TEST)'
            },
            {
                id_slot: 2,
                orario: '10:00',
                status: 'occupied',
                title: 'Slot occupato (TEST)',
                hold_time_remaining: 15
            },
            {
                id_slot: 3,
                orario: '11:00',
                status: 'past',
                title: 'Orario passato (TEST)'
            }
        ];
        
        res.json({
            success: true,
            message: 'Simulazione prenotazioni per test',
            data: {
                spazio: {
                    id: 1,
                    nome: 'Spazio Test'
                },
                data: new Date().toISOString().split('T')[0],
                slots: testBookings
            }
        });
    } catch (error) {
        console.error('❌ Errore test simulazione prenotazioni:', error);
        res.status(500).json({
            success: false,
            error: 'Errore test simulazione prenotazioni'
        });
    }
}

module.exports = {
    getDisponibilitaSlot,
    testEndpoint,
    testSimulateBookings
};



