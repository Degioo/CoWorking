const express = require('express');
const router = express.Router();
const concorrenzaController = require('../controllers/concorrenzaController');
const { authenticateToken } = require('../middleware/auth');

// GET /api/concorrenza/spazi/:id/stato-concorrenza
// Ottiene lo stato di concorrenza per uno spazio specifico
router.get('/spazi/:id/stato-concorrenza', authenticateToken, concorrenzaController.getStatoConcorrenza);

module.exports = router;


