// fix-challenges-schema.js
require('dotenv').config();
const { db } = require('./db');

async function fixChallengesSchema() {
  try {
    console.log('🔄 Repariere Challenges Tabellen-Schema...');
    
    // Prüfe welche Spalten fehlen
    const columns = await db('challenges').columnInfo();
    console.log('📋 Vorhandene Spalten:', Object.keys(columns));
    
    // Fehlende Spalten hinzufügen
    const missingColumns = [];
    
    if (!columns.aufgabenpaket_id) {
      missingColumns.push('aufgabenpaket_id');
      await db.schema.alterTable('challenges', (table) => {
        table.integer('aufgabenpaket_id').unsigned().after('id');
      });
    }
    
    if (!columns.schueler_id) {
      missingColumns.push('schueler_id');
      await db.schema.alterTable('challenges', (table) => {
        table.integer('schueler_id').unsigned().after('team_id');
      });
    }
    
    if (missingColumns.length > 0) {
      console.log('✅ Fehlende Spalten hinzugefügt:', missingColumns);
    } else {
      console.log('✅ Alle Spalten sind vorhanden');
    }
    
    // Finale Spalten-Liste anzeigen
    const finalColumns = await db('challenges').columnInfo();
    console.log('🎉 Finale Spalten:', Object.keys(finalColumns));
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await db.destroy();
  }
}

fixChallengesSchema();