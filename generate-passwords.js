const bcrypt = require('bcryptjs');

async function generatePasswords() {
    const password = 'password123';
    const saltRounds = 10;

    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Password originale:', password);
        console.log('Password hashata:', hash);
        console.log('\nUsa questa hash nel file seed-postgres.sql');
    } catch (error) {
        console.error('Errore:', error);
    }
}

generatePasswords();
