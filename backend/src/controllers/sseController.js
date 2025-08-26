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
            const query = `
                SELECT 
                    s.id_slot,
                    s.orario_inizio,
                    s.orario_fine,
                    CASE 
                        WHEN s.orario_inizio < NOW() THEN 'past'
                        WHEN p.id_prenotazione IS NOT NULL AND p.stato = 'confermata' THEN 'booked'
                        WHEN p.id_prenotazione IS NOT NULL AND p.stato = 'in_attesa' THEN 'occupied'
                        ELSE 'available'
                    END as status,
                    p.id_prenotazione,
                    p.stato as prenotazione_stato,
                    p.data_creazione,
                    EXTRACT(EPOCH FROM (p.data_creazione + INTERVAL '5 minutes' - NOW())) as hold_time_remaining
                FROM slot_orari s
                LEFT JOIN prenotazioni p ON s.id_slot = p.id_slot 
                    AND p.data_inizio::date = $3::date
                    AND p.stato IN ('in_attesa', 'confermata')
                WHERE s.id_sede = $1 
                    AND s.id_spazio = $2
                    AND s.orario_inizio::date = $3::date
                ORDER BY s.orario_inizio
            `;

            const result = await pool.query(query, [sedeId, spazioId, data]);

            return result.rows.map(row => ({
                id_slot: row.id_slot,
                orario_inizio: row.orario_inizio,
                orario_fine: row.orario_fine,
                status: row.status,
                id_prenotazione: row.id_prenotazione,
                prenotazione_stato: row.prenotazione_stato,
                hold_time_remaining: row.hold_time_remaining > 0 ? Math.ceil(row.hold_time_remaining / 60) : null
            }));
        } catch (error) {
            console.error('Errore nel recupero stato slot:', error);
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
