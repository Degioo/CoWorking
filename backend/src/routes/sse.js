const express = require('express');
const router = express.Router();
const SSEController = require('../controllers/sseController');
const { authenticateSSEToken } = require('../middleware/sseAuth');
const pool = require('../db');

// Endpoint per connessione SSE
router.get('/status-stream', authenticateSSEToken, (req, res) => {
    SSEController.initConnection(req, res);
});

// Endpoint per ottenere stato corrente degli slot
router.get('/slots-status/:sedeId/:spazioId/:data', authenticateSSEToken, async (req, res) => {
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
router.post('/update-slot-status', authenticateSSEToken, async (req, res) => {
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
router.get('/stats', authenticateSSEToken, (req, res) => {
    res.json({
        success: true,
        data: {
            activeConnections: SSEController.connections.size,
            timestamp: new Date().toISOString()
        }
    });
});

// Endpoint di test per verificare connessione database
router.get('/test-db', authenticateSSEToken, async (req, res) => {
    try {
        console.log('🧪 SSE Test DB chiamato');
        
        // Test connessione database
        const testQuery = 'SELECT NOW() as current_time, version() as db_version';
        const result = await pool.query(testQuery);
        
        res.json({
            success: true,
            message: 'Test database SSE completato',
            data: {
                currentTime: result.rows[0].current_time,
                dbVersion: result.rows[0].db_version,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ SSE Test DB errore:', error);
        res.status(500).json({
            success: false,
            error: 'Errore test database SSE',
            details: error.message
        });
    }
});

module.exports = router;
