const pool = require('../db');
const bcrypt = require('bcryptjs');

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
    res.status(201).json({ message: 'Registrazione avvenuta', id_utente: result.rows[0].id_utente });
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
    res.json({
      message: 'Login effettuato',
      id_utente: user.id_utente,
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo
    });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
}; 