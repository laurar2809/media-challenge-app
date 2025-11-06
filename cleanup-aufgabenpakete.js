// cleanup-aufgabenpakete.js - Nur doppelte Aufgabenpakete löschen
require('dotenv').config();
const { db } = require('./db');

async function cleanupDuplicateAufgabenpakete() {
  try {
    console.log('🧹 Suche nach doppelten Aufgabenpaketen...');
    
    // Finde doppelte Aufgabenpakete (gleicher Titel)
    const duplicates = await db('aufgabenpakete')
      .select('title')
      .count('* as count')
      .groupBy('title')
      .having('count', '>', 1);
    
    console.log('Gefundene Duplikate:', duplicates);
    
    // Lösche die Duplikate (behalte nur den ersten Eintrag pro Titel)
    for (const dup of duplicates) {
      const records = await db('aufgabenpakete')
        .where('title', dup.title)
        .orderBy('id', 'asc');
      
      // Behalte den ersten, lösche den Rest
      const toDelete = records.slice(1);
      
      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(r => r.id);
        await db('aufgabenpakete').whereIn('id', idsToDelete).del();
        console.log(`✅ Gelöscht: ${toDelete.length} Duplikate von "${dup.title}"`);
      }
    }
    
    console.log('🎉 Doppelte Aufgabenpakete bereinigt');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await db.destroy();
  }
}

cleanupDuplicateAufgabenpakete();