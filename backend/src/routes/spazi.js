const express = require('express');
const router = express.Router();
const spaziController = require('../controllers/spaziController');

// Endpoint di test
router.get('/test', spaziController.testEndpoint);

// Endpoint pubblico per ottenere disponibilità slot (senza autenticazione)
router.get('/:id_spazio/disponibilita-slot/:data', spaziController.getDisponibilitaSlot);

module.exports = router;
