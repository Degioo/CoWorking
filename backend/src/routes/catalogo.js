const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');

router.get('/sedi', catalogoController.getSedi);
router.get('/spazi', catalogoController.getSpazi);
router.get('/servizi', catalogoController.getServizi);
router.get('/spazi/:id/servizi', catalogoController.getServiziSpazio);
router.get('/test-db', catalogoController.testDatabaseConnection);

module.exports = router; 