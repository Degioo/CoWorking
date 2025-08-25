// Configurazione JWT
const jwt = require('jsonwebtoken');

// Chiave segreta per firmare i token JWT
// In produzione dovrebbe essere in una variabile d'ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'coworking-mio-secret-key-2024';

// Opzioni per la generazione dei token
const JWT_OPTIONS = {
    expiresIn: '24h', // Token valido per 24 ore
    issuer: 'coworking-mio',
    audience: 'coworking-mio-users'
};

// Funzione per generare un token JWT
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, JWT_OPTIONS);
}

// Funzione per verificare un token JWT
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Token non valido');
    }
}

module.exports = {
    JWT_SECRET,
    JWT_OPTIONS,
    generateToken,
    verifyToken
};

