const pool = require('../db');

exports.getSedi = async (req, res) => {
  const { citta } = req.query;
  try {
    let result;
    if (citta) {
      result = await pool.query('SELECT * FROM Sede WHERE citta = $1', [citta]);
    } else {
      result = await pool.query('SELECT * FROM Sede');
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

exports.getSpazi = async (req, res) => {
  const { id_sede, tipologia } = req.query;
  try {
    let base = 'SELECT * FROM Spazio';
    let where = [];
    let params = [];
    if (id_sede) {
      params.push(id_sede);
      where.push(`id_sede = $${params.length}`);
    }
    if (tipologia) {
      params.push(tipologia);
      where.push(`tipologia = $${params.length}`);
    }
    if (where.length > 0) {
      base += ' WHERE ' + where.join(' AND ');
    }
    const result = await pool.query(base, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

exports.getServizi = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Servizio');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

exports.getServiziSpazio = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT s.id_servizio, s.nome, s.descrizione
       FROM Servizio s
       JOIN Spazio_Servizio ss ON s.id_servizio = ss.id_servizio
       WHERE ss.id_spazio = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
}; 