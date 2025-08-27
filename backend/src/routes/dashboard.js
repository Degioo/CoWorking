const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Endpoint di test per verificare se il middleware funziona
router.get('/test-auth', authenticateToken, (req, res) => {
    console.log('✅ Dashboard Test Auth - Middleware funziona');
    res.json({
        message: 'Middleware di autenticazione funziona',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// Route per le statistiche dashboard
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);

// Route per i grafici dashboard
router.get('/charts', authenticateToken, dashboardController.getDashboardCharts);

// Route per le attività recenti dashboard
router.get('/activity', authenticateToken, dashboardController.getDashboardActivity);

module.exports = router;
