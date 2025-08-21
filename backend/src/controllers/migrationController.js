

class MigrationController {
    static async applySpazioMigration(req, res) {
        try {
            console.log('🔄 Applicazione migrazione Spazio...');
            
            // Esegui la migrazione
            const db = require('../db');
            
            // Esegui i comandi SQL uno per uno, gestendo i blocchi DO $$
            const commands = [
                // Aggiungi campo stato
                "ALTER TABLE Spazio ADD COLUMN IF NOT EXISTS stato TEXT DEFAULT 'disponibile'",
                
                // Aggiungi constraint CHECK per stato
                `DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'check_stato_spazio'
                    ) THEN
                        ALTER TABLE Spazio 
                        ADD CONSTRAINT check_stato_spazio 
                        CHECK (stato IN ('disponibile', 'in_prenotazione', 'occupato', 'manutenzione'));
                    END IF;
                END $$`,
                
                // Aggiungi campo ultima_prenotazione
                "ALTER TABLE Spazio ADD COLUMN IF NOT EXISTS ultima_prenotazione TIMESTAMP",
                
                // Aggiungi campo utente_prenotazione
                "ALTER TABLE Spazio ADD COLUMN IF NOT EXISTS utente_prenotazione INTEGER REFERENCES Utente(id_utente)",
                
                // Crea indice per ottimizzare le query di scadenza
                `DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_indexes 
                        WHERE indexname = 'idx_spazio_stato_ultima_prenotazione'
                    ) THEN
                        CREATE INDEX idx_spazio_stato_ultima_prenotazione 
                        ON Spazio(stato, ultima_prenotazione) 
                        WHERE stato = 'in_prenotazione';
                    END IF;
                END $$`,
                
                // Aggiorna tutti gli spazi esistenti a 'disponibile'
                "UPDATE Spazio SET stato = 'disponibile' WHERE stato IS NULL"
            ];
            
            for (const command of commands) {
                if (command.trim()) {
                    try {
                        await db.query(command);
                        console.log('✅ Comando eseguito:', command.substring(0, 50) + '...');
                    } catch (err) {
                        if (err.code === '42P07') {
                            console.log('ℹ️ Campo già esistente, continuando...');
                        } else if (err.code === '42710') {
                            console.log('ℹ️ Constraint già esistente, continuando...');
                        } else if (err.code === '42P06') {
                            console.log('ℹ️ Indice già esistente, continuando...');
                        } else {
                            console.error('❌ Errore comando:', err.message);
                            throw err;
                        }
                    }
                }
            }
            
            // Verifica che i campi siano stati aggiunti
            const result = await db.query(`
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable, 
                    column_default
                FROM information_schema.columns 
                WHERE table_name = 'spazio' 
                AND column_name IN ('stato', 'ultima_prenotazione', 'utente_prenotazione')
                ORDER BY column_name;
            `);
            
            console.log('🔍 Verifica campi aggiunti:', result.rows);
            
            res.json({
                success: true,
                message: 'Migrazione applicata con successo',
                fields: result.rows
            });
            
        } catch (error) {
            console.error('❌ Errore durante la migrazione:', error);
            res.status(500).json({
                success: false,
                message: 'Errore durante la migrazione',
                error: error.message
            });
        }
    }
    
    static async checkMigrationStatus(req, res) {
        try {
            const db = require('../db');
            
            // Verifica se i campi esistono
            const result = await db.query(`
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable, 
                    column_default
                FROM information_schema.columns 
                WHERE table_name = 'spazio' 
                AND column_name IN ('stato', 'ultima_prenotazione', 'utente_prenotazione')
                ORDER BY column_name;
            `);
            
            const fieldsExist = result.rows.length === 3;
            
            res.json({
                migrationApplied: fieldsExist,
                fields: result.rows,
                message: fieldsExist ? 'Migrazione già applicata' : 'Migrazione non ancora applicata'
            });
            
        } catch (error) {
            console.error('❌ Errore verifica migrazione:', error);
            res.status(500).json({
                success: false,
                message: 'Errore verifica migrazione',
                error: error.message
            });
        }
    }
}

module.exports = MigrationController;
