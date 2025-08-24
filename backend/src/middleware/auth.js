const pool = require('../db');

// Middleware per verificare l'autenticazione JWT
const { verifyToken } = require('../config/jwt');

// Middleware per verificare se l'utente è autenticato
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Token di accesso richiesto' });
    }
    
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token non valido o scaduto' });
    }
}

// Middleware per verificare se l'utente ha un ruolo specifico
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Autenticazione richiesta' });
        }
        
        if (req.user.ruolo !== role) {
            return res.status(403).json({ error: 'Ruolo non autorizzato' });
        }
        
        next();
    };
}

// Middleware per verificare se l'utente è responsabile o admin
function requireResponsabileOrAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Autenticazione richiesta' });
    }
    
    if (req.user.ruolo !== 'responsabile' && req.user.ruolo !== 'admin') {
        return res.status(403).json({ error: 'Ruolo non autorizzato' });
    }
    
    next();
}

module.exports = {
    authenticateToken,
    requireRole,
    requireResponsabileOrAdmin
};
