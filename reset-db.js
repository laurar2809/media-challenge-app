// reset-db.js - Einfacher Reset
require('dotenv').config();
const fs = require('fs');

async function resetDatabase() {
  try {
    console.log('🔄 Setze Datenbank zurück...');
    
    // SQLite Datei löschen
    if (fs.existsSync('./data.sqlite')) {
      fs.unlinkSync('./data.sqlite');
      console.log('✅ data.sqlite gelöscht');
    }
    
    console.log('🎉 Datenbank zurückgesetzt!');
    console.log('ℹ️  Führen Sie jetzt aus:');
    console.log('   node Datenbank/schemaDb.js');
    console.log('   node Datenbank/seedDb.js');
    
  } catch (error) {
    console.error('❌ Fehler beim Reset:', error);
  }
}

resetDatabase();