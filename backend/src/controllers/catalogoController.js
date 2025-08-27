const pool = require('../db');

exports.getSedi = async (req, res) => {
  const { citta } = req.query;
  const startTime = Date.now();

  try {
    console.log('🔄 getSedi chiamata:', { citta, timestamp: new Date().toISOString() });

    let result;
    if (citta) {
      console.log(`📍 Query con filtro città: ${citta}`);
      result = await pool.query('SELECT * FROM Sede WHERE citta = $1', [citta]);
    } else {
      console.log('📍 Query senza filtri - tutte le sedi');
      result = await pool.query('SELECT * FROM Sede');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ getSedi completata in ${duration}ms - ${result.rows.length} sedi trovate`);

    res.json(result.rows);

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('❌ Errore getSedi:', {
      error: err.message,
      stack: err.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Errore server',
      details: err.message,
      duration: `${duration}ms`
    });
  }
};

exports.getSpazi = async (req, res) => {
  const { id_sede, tipologia } = req.query;
  const startTime = Date.now();

  try {
    console.log('🔄 getSpazi chiamata:', { id_sede, tipologia, timestamp: new Date().toISOString() });

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

    console.log(`📍 Query SQL: ${base}`);
    console.log(`🔢 Parametri:`, params);

    const result = await pool.query(base, params);

    const duration = Date.now() - startTime;
    console.log(`✅ getSpazi completata in ${duration}ms - ${result.rows.length} spazi trovati`);

    res.json(result.rows);

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('❌ Errore getSpazi:', {
      error: err.message,
      stack: err.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Errore server',
      details: err.message,
      duration: `${duration}ms`
    });
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

// Test connessione database e performance
exports.testDatabaseConnection = async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('🔄 Test connessione database...');

    // Test 1: Connessione base
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connessione database OK:', connectionTest.rows[0]);

    // Test 2: Query sedi
    const sediStart = Date.now();
    const sediResult = await pool.query('SELECT COUNT(*) as count FROM Sede');
    const sediDuration = Date.now() - sediStart;
    console.log(`✅ Query sedi completata in ${sediDuration}ms:`, sediResult.rows[0]);

    // Test 3: Query spazi
    const spaziStart = Date.now();
    const spaziResult = await pool.query('SELECT COUNT(*) as count FROM Spazio');
    const spaziDuration = Date.now() - spaziStart;
    console.log(`✅ Query spazi completata in ${spaziDuration}ms:`, spaziResult.rows[0]);

    const totalDuration = Date.now() - startTime;

    res.json({
      success: true,
      tests: {
        connection: 'OK',
        sedi: { count: sediResult.rows[0].count, duration: `${sediDuration}ms` },
        spazi: { count: spaziResult.rows[0].count, duration: `${spaziDuration}ms` }
      },
      totalDuration: `${totalDuration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ Test database fallito:', {
      error: err.message,
      stack: err.stack,
      duration: `${totalDuration}ms`
    });

    res.status(500).json({
      success: false,
      error: err.message,
      duration: `${totalDuration}ms`
    });
  }
}; 