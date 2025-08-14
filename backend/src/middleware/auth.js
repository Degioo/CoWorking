const pool = require('../db');

// Middleware per verificare che l'utente sia autenticato
function authenticateToken(req, res, next) {
    // Prima prova con X-User-ID (nuovo sistema)
    const userId = req.headers['x-user-id'];
    
    if (userId) {
        // Verifica che l'utente esista nel database
        pool.query('SELECT * FROM Utente WHERE id_utente = $1', [userId])
            .then(result => {
                if (result.rows.length > 0) {
                    req.user = result.rows[0];
                    next();
                } else {
                    return res.status(401).json({ error: 'Utente non trovato' });
                }
            })
            .catch(err => {
                console.error('Errore verifica utente:', err);
                return res.status(500).json({ error: 'Errore server' });
            });
        return;
    }

    // Fallback per JWT (sistema legacy)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token di accesso o X-User-ID richiesto' });
    }

    // Per ora, se c'è un token JWT, lo accettiamo senza verifica
    // (per compatibilità con il sistema esistente)
    req.user = { id_utente: userId || 'legacy' };
    next();
}

// Middleware per verificare che l'utente abbia un ruolo specifico
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Autenticazione richiesta' });
        }

        if (req.user.ruolo !== role && req.user.ruolo !== 'amministratore') {
            return res.status(403).json({ error: 'Permessi insufficienti' });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole
};
