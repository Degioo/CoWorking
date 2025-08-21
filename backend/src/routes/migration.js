const express = require('express');
const router = express.Router();
const MigrationController = require('../controllers/migrationController');

// Endpoint per applicare la migrazione Spazio
router.post('/apply-spazio', MigrationController.applySpazioMigration);

// Endpoint per verificare lo stato della migrazione
router.get('/status', MigrationController.checkMigrationStatus);

module.exports = router;
