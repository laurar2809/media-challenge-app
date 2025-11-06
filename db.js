// db.js
const knex = require('knex');
require('dotenv').config();

let client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

/**
 * Supported clients:
 *  - sqlite  (default)
 *  - pg      (PostgreSQL)
 *  - mysql   (MySQL/MariaDB)
 */
let dbConfig;

if (client === 'sqlite') {
  dbConfig = {
    client: 'sqlite3',
    connection: { filename: process.env.DB_FILE || './data.sqlite' },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 }
  };
} else if (client === 'pg') {
  dbConfig = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'postgres',
      port: Number(process.env.DB_PORT || 5432),
    }
  };
} else if (client === 'mysql') {
  dbConfig = {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'test',
      port: Number(process.env.DB_PORT || 3306),
    }
  };
} else {
  throw new Error("Unsupported DB_CLIENT. Use sqlite | pg | mysql");
}

const db = knex(dbConfig);

// Ensure table exists
// db.js - ANGEPASSTE VERSION FÜR MYSQL
async function init() {
  try {
    console.log('Prüfe Verbindung...');
    
    // Einfache Abfrage um Verbindung zu testen
    await db.raw('SELECT 1');
    console.log('Verbindung erfolgreich!');
    
    // Tabellen existieren lassen (nicht automatisch erstellen)
    const itemsExists = await db.schema.hasTable('items');
    const challengesExists = await db.schema.hasTable('challenges');
    
    console.log(`Items-Tabelle vorhanden: ${itemsExists}`);
    console.log(`Challenges-Tabelle vorhanden: ${challengesExists}`);
    
    if (!itemsExists) {
      console.log('Items-Tabelle fehlt. Bitte manuell erstellen.');
    }
    if (!challengesExists) {
      console.log('ℹChallenges-Tabelle fehlt. Bitte manuell erstellen.');
    }
    
  } catch (error) {
    console.error('Verbindungsfehler:', error.message);
    throw error;
  }
}


module.exports = { db, init };
