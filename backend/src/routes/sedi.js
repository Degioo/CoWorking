const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/sedi - Lista tutte le sedi
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sede ORDER BY nome');
        res.json(result.rows);
    } catch (error) {
        console.error('Errore nel recupero delle sedi:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/sedi/:id - Dettagli di una sede specifica
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM sede WHERE id_sede = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sede non trovata' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore nel recupero della sede:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

module.exports = router;
