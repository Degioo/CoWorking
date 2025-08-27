const pool = require('../db');

// Middleware per verificare l'autenticazione JWT
const { verifyToken } = require('../config/jwt');

// Middleware per verificare se l'utente è autenticato
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth Middleware - Headers:', req.headers);
    console.log('🔐 Auth Middleware - Auth Header:', authHeader);
    console.log('🔐 Auth Middleware - Token estratto:', token ? token.substring(0, 20) + '...' : 'null');

    if (!token) {
        console.log('❌ Auth Middleware - Token mancante');
        return res.status(401).json({ error: 'Token di accesso richiesto' });
    }

    try {
        const decoded = verifyToken(token);
        console.log('✅ Auth Middleware - Token decodificato:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('❌ Auth Middleware - Errore verifica token:', error);
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
