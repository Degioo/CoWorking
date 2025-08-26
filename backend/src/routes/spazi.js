const express = require('express');
const router = express.Router();
const spaziController = require('../controllers/spaziController');

// Middleware di logging per tutte le richieste
router.use((req, res, next) => {
    console.log(`🏢 Spazi Route - ${req.method} ${req.path}`);
    console.log(`🏢 Spazi Route - Params:`, req.params);
    console.log(`🏢 Spazi Route - Query:`, req.query);
    console.log(`🏢 Spazi Route - Origin:`, req.headers.origin);
    next();
});

// Endpoint di test
router.get('/test', spaziController.testEndpoint);

// Endpoint pubblico per ottenere disponibilità slot (senza autenticazione)
router.get('/:id_spazio/disponibilita-slot/:data', spaziController.getDisponibilitaSlot);

module.exports = router;
