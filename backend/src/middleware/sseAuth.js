const jwt = require('jsonwebtoken');

/**
 * Middleware per autenticazione SSE che accetta token via query string
 * EventSource non supporta headers personalizzati, quindi usiamo query params
 */
const authenticateSSEToken = (req, res, next) => {
    try {
        // Cerca il token nella query string
        const token = req.query.token;
        
        if (!token) {
            console.log('❌ SSE Auth: Token mancante nella query string');
            return res.status(401).json({ 
                success: false, 
                error: 'Token di autenticazione richiesto' 
            });
        }

        // Verifica il token
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.log('❌ SSE Auth: Token non valido:', err.message);
                return res.status(401).json({ 
                    success: false, 
                    error: 'Token non valido' 
                });
            }

            // Token valido, aggiungi i dati utente alla request
            req.user = decoded;
            console.log('✅ SSE Auth: Utente autenticato:', decoded.nome, decoded.cognome);
            next();
        });

    } catch (error) {
        console.error('❌ SSE Auth: Errore durante autenticazione:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Errore durante autenticazione' 
        });
    }
};

module.exports = { authenticateSSEToken };
