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
async function init() {
  const exists = await db.schema.hasTable('items');
  if (!exists) {
    await db.schema.createTable('items', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description').notNullable();
      table.string('icon'); // emoji, URL, or '/uploads/<filename>'
    });
    // Seed data
    await db('items').insert([
      { title: 'Beispiel 1', description: 'Kurze Beschreibung für Datensatz 1', icon: '💡' },
      { title: 'Beispiel 2', description: 'Noch eine Beschreibung – mit etwas mehr Text.', icon: 'https://cdn-icons-png.flaticon.com/512/1829/1829586.png' },
      { title: 'Beispiel 3', description: 'Beschreibung 3', icon: '⭐' },
    ]);
    console.log("Tabelle 'items' erstellt und Seed-Daten eingefügt.");
  }



   // Prüfe ob challenges Tabelle existiert
  const challengesExists = await db.schema.hasTable('challenges');
  
  if (!challengesExists) {
    // NEUE Tabelle erstellen
    await db.schema.createTable('challenges', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description').notNullable();
      table.string('icon');
      table.string('kategorie').notNullable();
      table.date('start_date');
      table.date('end_date');
      
    });
    console.log("Tabelle 'challenges' erstellt");

    // Beispiel-Challenge einfügen
    await db('challenges').insert([
      { 
        title: 'Video Challenge', 
        description: 'Erstelle einen 1-minütigen Kurzfilm', 
        kategorie: 'Video',
        icon: '🎬'
      }
    ]);
    console.log("Beispiel-Challenge eingefügt");
 
  } 
}


module.exports = { db, init };
