// test-mysql.js
require('dotenv').config();
const { db, init } = require('./db');

async function test() {
  try {
    console.log('Teste MySQL-Verbindung...');
    console.log('Host:', process.env.DB_HOST);
    console.log('Database:', process.env.DB_NAME);
    
    await init();
    
    // Teste Tabellen-Zugriff
    const items = await db('items').select('*');
    const challenges = await db('challenges').select('*');
    
    console.log('ERFOLG! MySQL funktioniert!');
    console.log(`Items: ${items.length} Datensätze`);
    console.log(`Challenges: ${challenges.length} Datensätze`);
    
  } catch (error) {
    console.log('Fehler:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('Zugriff verweigert - User/Passwort prüfen');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('Datenbank existiert nicht');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Verbindung verweigert - Host/Port prüfen');
    }
  }
}

test();