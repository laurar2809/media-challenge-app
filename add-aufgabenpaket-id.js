// add-aufgabenpaket-id.js
require('dotenv').config();
const { db } = require('./db');

async function addAufgabenpaketIdColumn() {
  try {
    console.log('🔄 Füge aufgabenpaket_id Spalte hinzu...');
    
    // Prüfe ob die Spalte bereits existiert
    const hasColumn = await db.schema.hasColumn('challenges', 'aufgabenpaket_id');
    
    if (!hasColumn) {
      await db.schema.alterTable('challenges', (table) => {
        table.integer('aufgabenpaket_id').unsigned().after('id');
      });
      console.log('✅ aufgabenpaket_id Spalte erfolgreich hinzugefügt');
    } else {
      console.log('✅ aufgabenpaket_id Spalte existiert bereits');
    }
    
    // Zeige die aktuelle Tabellenstruktur
    const columns = await db('challenges').columnInfo();
    console.log('📋 Aktuelle Spalten:', Object.keys(columns));
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await db.destroy();
  }
}

addAufgabenpaketIdColumn();