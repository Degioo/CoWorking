const express = require('express');
const router = express.Router();
const SSEController = require('../controllers/sseController');
const { authenticateToken } = require('../middleware/auth');

// Endpoint per connessione SSE
router.get('/status-stream', authenticateToken, (req, res) => {
    SSEController.initConnection(req, res);
});

// Endpoint per ottenere stato corrente degli slot
router.get('/slots-status/:sedeId/:spazioId/:data', authenticateToken, async (req, res) => {
    try {
        const { sedeId, spazioId, data } = req.params;

        const slotsStatus = await SSEController.getSlotsStatus(
            parseInt(sedeId),
            parseInt(spazioId),
            data
        );

        res.json({
            success: true,
            data: slotsStatus
        });
    } catch (error) {
        console.error('Errore nel recupero stato slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero stato slot'
        });
    }
});

// Endpoint per aggiornare stato slot (per testing)
router.post('/update-slot-status', authenticateToken, async (req, res) => {
    try {
        const { slotId, status, prenotazioneId } = req.body;

        await SSEController.updateSlotStatus(slotId, status, prenotazioneId);

        res.json({
            success: true,
            message: 'Stato slot aggiornato e notificato'
        });
    } catch (error) {
        console.error('Errore nell\'aggiornamento stato slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nell\'aggiornamento stato slot'
        });
    }
});

// Endpoint per ottenere statistiche connessioni SSE
router.get('/stats', authenticateToken, (req, res) => {
    res.json({
        success: true,
        data: {
            activeConnections: SSEController.connections.size,
            timestamp: new Date().toISOString()
        }
    });
});

module.exports = router;
