const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Traccia un evento analytics
router.post('/analytics/event', analyticsController.trackEvent);

// Sincronizza eventi analytics
router.post('/analytics/sync', analyticsController.syncAnalytics);

// Pulisci analytics utente
router.delete('/analytics/clear-user/:userId', analyticsController.clearUserAnalytics);

// Ottieni statistiche analytics
router.get('/analytics/stats', analyticsController.getAnalyticsStats);

module.exports = router;
