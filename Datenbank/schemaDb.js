// schemaDb.js - UNIVERSAL FÜR SQLITE & MYSQL
require('dotenv').config();
const { db } = require('../db');

async function createSchema() {
  try {
    const dbClient = process.env.DB_CLIENT || 'sqlite';
    console.log(`Erstelle Datenbank-Schema für ${dbClient.toUpperCase()}...`);

    // categories Tabelle
    await db.schema.createTableIfNotExists('categories', (table) => {
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.string('icon', 500);
      table.timestamps(true, true);
    });
    console.log(' Categories-Tabelle erstellt/geprüft');

    // aufgabenpakete Tabelle (VORLAGEN)
    await db.schema.createTableIfNotExists('aufgabenpakete', (table) => {
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.string('kategorie', 255).notNullable();
      table.string('icon', 500);
      table.timestamps(true, true);
    });
    console.log(' Aufgabenpakete-Tabelle erstellt/geprüft');

    // klassen Tabelle
    await db.schema.createTableIfNotExists('klassen', (table) => {
      table.increments('id').primary();
      table.string('name', 50).notNullable().unique();
      table.timestamps(true, true);
    });
    console.log(' Klassen-Tabelle erstellt/geprüft');

    // schueler Tabelle
  // schueler Tabelle - VEREINFACHTE VERSION
await db.schema.createTableIfNotExists('schueler', (table) => {
  table.increments('id').primary();
  table.string('vorname', 100).notNullable();
  table.string('nachname', 100).notNullable();
  table.string('klasse', 20); // Einfaches Textfeld statt Fremdschlüssel
  table.timestamps(true, true);
});
    console.log(' Schueler-Tabelle erstellt/geprüft');

    // TEAMS Tabelle (NEU - für Team-Challenges)
    await db.schema.createTableIfNotExists('teams', (table) => {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.text('beschreibung');
      table.timestamps(true, true);
    });
    console.log(' Teams-Tabelle erstellt/geprüft');

    // TEAM_MITGLIEDER Tabelle (Schüler in Teams)
    await db.schema.createTableIfNotExists('team_mitglieder', (table) => {
      table.increments('id').primary();
      table.integer('team_id').unsigned().notNullable();
      table.integer('schueler_id').unsigned().notNullable();
      
      // ENUM für MySQL, string für SQLite
      if (dbClient === 'mysql' || dbClient === 'pg') {
        table.enu('rolle', ['mitglied', 'teamleiter']).defaultTo('mitglied');
      } else {
        table.string('rolle', 20).defaultTo('mitglied');
      }
      
      table.timestamps(true, true);
      
      // Fremdschlüssel nur für MySQL/PostgreSQL
      if (dbClient !== 'sqlite') {
        table.foreign('team_id').references('id').inTable('teams').onDelete('CASCADE');
        table.foreign('schueler_id').references('id').inTable('schueler').onDelete('CASCADE');
        table.unique(['team_id', 'schueler_id']);
      } else {
        // Für SQLite: Unique constraint ohne Fremdschlüssel
        table.unique(['team_id', 'schueler_id']);
      }
    });
    console.log('✅ Team-Mitglieder-Tabelle erstellt/geprüft');

    // CHALLENGES Tabelle (KONKRETE INSTANZEN - wie Aufgabenpakete + mehr)
    await db.schema.createTableIfNotExists('challenges', (table) => {
      table.increments('id').primary();
      
      // BASIS DATEN (wie Aufgabenpakete)
      table.string('title', 255).notNullable();
      table.text('beschreibung').notNullable();
      table.string('kategorie', 255).notNullable();
      table.string('icon', 500);
      
      // ZUSÄTZLICHE INFOS (neu für Challenges)
      table.text('zusatzinfos');
      table.date('abgabedatum');
      
      // TEAM ZUWEISUNG
      table.integer('team_id').unsigned();
      
      // STATUS & BEWERTUNG
      if (dbClient === 'mysql' || dbClient === 'pg') {
        table.enu('status', ['offen', 'in_arbeit', 'abgeschlossen', 'bewertet']).defaultTo('offen');
      } else {
        table.string('status', 20).defaultTo('offen');
      }
      
      table.integer('erreichte_punkte');
      table.text('feedback');
      table.text('abgabe_url');
      
      // METADATEN
      table.timestamps(true, true);
      
      // FREMDSCHELSSEL nur für MySQL/PostgreSQL
      if (dbClient !== 'sqlite') {
        table.foreign('team_id').references('id').inTable('teams').onDelete('SET NULL');
      }
    });
    console.log(' Challenges-Tabelle erstellt/geprüft (KONKRETE INSTANZEN)');

    // CHALLENGE_BILDER Tabelle (Bilder für Challenges)
    await db.schema.createTableIfNotExists('challenge_bilder', (table) => {
      table.increments('id').primary();
      table.integer('challenge_id').unsigned().notNullable();
      table.string('bild_url', 500).notNullable();
      table.text('beschreibung');
      table.integer('reihenfolge').defaultTo(0);
      table.timestamps(true, true);
      
      // Fremdschlüssel nur für MySQL/PostgreSQL
      if (dbClient !== 'sqlite') {
        table.foreign('challenge_id').references('id').inTable('challenges').onDelete('CASCADE');
      }
    });
    console.log(' Challenge-Bilder-Tabelle erstellt/geprüft');

    console.log(' Universelles Datenbank-Schema erfolgreich erstellt!');

  } catch (error) {
    console.error(' Fehler beim Erstellen des Schemas:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  createSchema();
}

module.exports = { createSchema };