const fs = require('fs');
const path = require('path');

class MigrationController {
    static async applySpazioMigration(req, res) {
        try {
            console.log('🔄 Applicazione migrazione Spazio...');
            
            // Leggi il file di migrazione
            const migrationPath = path.resolve(__dirname, '../../database/add-spazio-prenotazione-fields.sql');
            const migration = fs.readFileSync(migrationPath, 'utf8');
            
            // Esegui la migrazione
            const db = require('../db');
            
            // Esegui ogni comando separatamente per gestire meglio gli errori
            const commands = migration.split(';').filter(cmd => cmd.trim());
            
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
