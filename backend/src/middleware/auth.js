const jwt = require('jsonwebtoken');
const config = require('../../config/config');

// Middleware per verificare che l'utente sia autenticato
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token di accesso richiesto' });
    }

    jwt.verify(token, config.jwt.secret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token non valido o scaduto' });
        }

        req.user = user;
        next();
    });
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
