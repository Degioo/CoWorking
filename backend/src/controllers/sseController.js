const pool = require('../db');

class SSEController {
    // Connessioni SSE attive
    static connections = new Set();

    // Inizializza connessione SSE
    static initConnection(req, res) {
        // Imposta headers per SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Aggiungi connessione alla lista
        this.connections.add(res);

        // Invia evento di connessione
        res.write(`data: ${JSON.stringify({
            type: 'connection',
            message: 'Connessione SSE stabilita',
            timestamp: new Date().toISOString()
        })}\n\n`);

        // Gestisci chiusura connessione
        req.on('close', () => {
            this.connections.delete(res);
            console.log('Connessione SSE chiusa. Connessioni attive:', this.connections.size);
        });

        // Mantieni connessione attiva con heartbeat
        const heartbeat = setInterval(() => {
            if (res.destroyed) {
                clearInterval(heartbeat);
                return;
            }
            res.write(`data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
            })}\n\n`);
        }, 30000); // Heartbeat ogni 30 secondi

        console.log('Nuova connessione SSE stabilita. Connessioni attive:', this.connections.size);
    }

    // Invia aggiornamento a tutti i client connessi
    static broadcastUpdate(update) {
        const message = `data: ${JSON.stringify(update)}\n\n`;

        this.connections.forEach(res => {
            if (!res.destroyed) {
                res.write(message);
            }
        });

        console.log('Aggiornamento broadcast inviato a', this.connections.size, 'client');
    }

    // Invia aggiornamento stato slot specifico
    static broadcastSlotUpdate(slotId, status, data = {}) {
        const update = {
            type: 'slot_update',
            slotId: slotId,
            status: status,
            data: data,
            timestamp: new Date().toISOString()
        };

        this.broadcastUpdate(update);
    }

    // Invia aggiornamento stato slot per sede/spazio/data
    static broadcastSlotsStatusUpdate(sedeId, spazioId, data, slotsStatus) {
        const update = {
            type: 'slots_status_update',
            sedeId: sedeId,
            spazioId: spazioId,
            data: data,
            slotsStatus: slotsStatus,
            timestamp: new Date().toISOString()
        };

        this.broadcastUpdate(update);
    }

    // Ottieni stato corrente di tutti gli slot per sede/spazio/data
    static async getSlotsStatus(sedeId, spazioId, data) {
        try {
            console.log(`🚀 SSEController - getSlotsStatus chiamato per sede: ${sedeId}, spazio: ${spazioId}, data: ${data}`);

            // Verifica che lo spazio esista
            const spazioQuery = 'SELECT id_spazio, nome FROM Spazio WHERE id_spazio = $1';
            const spazioResult = await pool.query(spazioQuery, [spazioId]);

            if (spazioResult.rows.length === 0) {
                throw new Error('Spazio non trovato');
            }

            const spazio = spazioResult.rows[0];
            console.log(`✅ Spazio trovato: ${spazio.nome}`);

            // Ottieni orari di apertura (9:00 - 18:00)
            const orariApertura = [];
            for (let hour = 9; hour <= 17; hour++) {
                orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
            }

            console.log(`⏰ Orari apertura generati: ${orariApertura.length} slot`);

            // Ottieni prenotazioni esistenti per questa data
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

                const prenotazioniResult = await pool.query(prenotazioniQuery, [spazioId, data]);
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

            console.log(`✅ SSEController - Stato slot calcolato: ${slotsStatus.length} slot`);
            return slotsStatus;

        } catch (error) {
            console.error('❌ SSEController - Errore nel recupero stato slot:', error);
            throw error;
        }
    }

    // Aggiorna stato slot e notifica tutti i client
    static async updateSlotStatus(slotId, status, prenotazioneId = null) {
        try {
            // Aggiorna stato nel database se necessario
            if (prenotazioneId) {
                // Logica per aggiornare prenotazione se necessario
                console.log(`Aggiornamento stato slot ${slotId} a ${status} per prenotazione ${prenotazioneId}`);
            }

            // Notifica tutti i client
            this.broadcastSlotUpdate(slotId, status, { prenotazioneId });

            return true;
        } catch (error) {
            console.error('Errore nell\'aggiornamento stato slot:', error);
            throw error;
        }
    }

    // Pulisci connessioni SSE chiuse
    static cleanupConnections() {
        this.connections.forEach(res => {
            if (res.destroyed) {
                this.connections.delete(res);
            }
        });
    }
}

module.exports = SSEController;
