const pool = require('../db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
  const { nome, cognome, email, password, ruolo, telefono } = req.body;
  if (!nome || !cognome || !email || !password || !ruolo) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori' });
  }
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const sql = `INSERT INTO Utente (nome, cognome, email, password, ruolo, telefono) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_utente`;
    const values = [nome, cognome, email, hash, ruolo, telefono];
    const result = await pool.query(sql, values);

    // Genera token JWT per l'utente appena registrato
    const userData = {
      id_utente: result.rows[0].id_utente,
      nome,
      cognome,
      email,
      ruolo,
      telefono
    };

    const token = generateToken(userData);

    res.status(201).json({
      message: 'Registrazione avvenuta',
      id_utente: result.rows[0].id_utente,
      token: token,
      nome,
      cognome,
      ruolo
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email già registrata' });
    }
    res.status(500).json({ error: 'Errore server' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password obbligatorie' });
  }
  try {
    const sql = `SELECT * FROM Utente WHERE email = $1`;
    const result = await pool.query(sql, [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenziali non valide' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Credenziali non valide' });

    // Genera token JWT per l'utente autenticato
    const userData = {
      id_utente: user.id_utente,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      ruolo: user.ruolo,
      telefono: user.telefono
    };

    const token = generateToken(userData);
    
    // Debug: log del token generato
    console.log('🔑 Token JWT generato per utente:', user.email);
    console.log('🔑 Token presente:', !!token);
    console.log('🔑 Lunghezza token:', token ? token.length : 0);
    console.log('🔑 Inizio token:', token ? token.substring(0, 20) + '...' : 'N/A');

    const response = {
      message: 'Login effettuato',
      id_utente: user.id_utente,
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo,
      token: token
    };
    
    console.log('📤 Risposta login inviata:', {
      message: response.message,
      id_utente: response.id_utente,
      nome: response.nome,
      token_presente: !!response.token
    });

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
}; 