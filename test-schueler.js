// test-schueler.js
require('dotenv').config();
const { db } = require('./db');

async function testSchueler() {
  try {
    console.log(' Teste Schüler-Daten...');
    
    // Alle Schüler mit Klassen anzeigen
    const schueler = await db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .select('schueler.*', 'klassen.name as klasse_name');
    
    console.log('Schüler mit Klassen:');
    schueler.forEach(s => {
      console.log(`- ${s.vorname} ${s.nachname} | Klasse: ${s.klasse_name || 'Keine'} | klasse_id: ${s.klasse_id}`);
    });
    
    // Alle Klassen anzeigen
    const klassen = await db('klassen').select('*');
    console.log('\nVerfügbare Klassen:');
    klassen.forEach(k => {
      console.log(`- ID: ${k.id} | Name: ${k.name}`);
    });
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await db.destroy();
  }
}

testSchueler();