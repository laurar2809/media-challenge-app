// schemaDb.js - UNIVERSAL FÜR SQLITE & MYSQL (KORRIGIERT)
require('dotenv').config();
const { db } = require('../db');

async function createSchema() {
  try {
    const dbClient = process.env.DB_CLIENT || 'sqlite';
    console.log(` Erstelle Datenbank-Schema für ${dbClient.toUpperCase()}...`);

    // categories Tabelle
    if (!(await db.schema.hasTable('categories'))) {
      await db.schema.createTable('categories', (table) => {
        table.increments('id').primary();
        table.string('title', 255).notNullable();
        table.text('description').notNullable();
        table.string('icon', 500);
        table.timestamps(true, true);
      });
      console.log(' Categories-Tabelle erstellt');
    } else {
      console.log('⏭ Categories-Tabelle existiert bereits');
    }

    // aufgabenpakete Tabelle
    if (!(await db.schema.hasTable('aufgabenpakete'))) {
      await db.schema.createTable('aufgabenpakete', (table) => {
        table.increments('id').primary();
        table.string('title', 255).notNullable();
        table.text('description').notNullable();
        table.string('kategorie', 255).notNullable();
        table.string('icon', 500);
        table.timestamps(true, true);
      });
      console.log(' Aufgabenpakete-Tabelle erstellt');
    } else {
      console.log('⏭ Aufgabenpakete-Tabelle existiert bereits');
    }

    // klassen Tabelle
    if (!(await db.schema.hasTable('klassen'))) {
      await db.schema.createTable('klassen', (table) => {
        table.increments('id').primary();
        table.string('name', 50).notNullable().unique();
        table.timestamps(true, true);
      });
      console.log(' Klassen-Tabelle erstellt');
    } else {
      console.log(' Klassen-Tabelle existiert bereits');
    }

    // schueler Tabelle
    if (!(await db.schema.hasTable('schueler'))) {
      await db.schema.createTable('schueler', (table) => {
        table.increments('id').primary();
        table.string('vorname', 100).notNullable();
        table.string('nachname', 100).notNullable();
        table.integer('klasse_id').unsigned();
        table.timestamps(true, true);
        
        if (dbClient !== 'sqlite') {
          table.foreign('klasse_id').references('id').inTable('klassen').onDelete('SET NULL');
        }
      });
      console.log(' Schueler-Tabelle erstellt');
    } else {
      console.log(' Schueler-Tabelle existiert bereits');
    }

    // teams Tabelle
    if (!(await db.schema.hasTable('teams'))) {
      await db.schema.createTable('teams', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.text('beschreibung');
        table.timestamps(true, true);
      });
      console.log(' Teams-Tabelle erstellt');
    } else {
      console.log('⏭ Teams-Tabelle existiert bereits');
    }

    // team_mitglieder Tabelle
    if (!(await db.schema.hasTable('team_mitglieder'))) {
      await db.schema.createTable('team_mitglieder', (table) => {
        table.increments('id').primary();
        table.integer('team_id').unsigned().notNullable();
        table.integer('schueler_id').unsigned().notNullable();
        
        if (dbClient === 'mysql' || dbClient === 'pg') {
          table.enu('rolle', ['mitglied', 'teamleiter']).defaultTo('mitglied');
        } else {
          table.string('rolle', 20).defaultTo('mitglied');
        }
        
        table.timestamps(true, true);
        
        if (dbClient !== 'sqlite') {
          table.foreign('team_id').references('id').inTable('teams').onDelete('CASCADE');
          table.foreign('schueler_id').references('id').inTable('schueler').onDelete('CASCADE');
          table.unique(['team_id', 'schueler_id']);
        } else {
          table.unique(['team_id', 'schueler_id']);
        }
      });
      console.log(' Team-Mitglieder-Tabelle erstellt');
    } else {
      console.log(' Team-Mitglieder-Tabelle existiert bereits');
    }

    // challenges Tabelle
    if (!(await db.schema.hasTable('challenges'))) {
      await db.schema.createTable('challenges', (table) => {
        table.increments('id').primary();
        
        // Basis Daten
        table.string('title', 255).notNullable();
        table.text('beschreibung').notNullable();
        table.string('kategorie', 255).notNullable();
        table.string('icon', 500);
        
        // Zusatzinfos
        table.text('zusatzinfos');
        table.date('abgabedatum');
        
        // Verknüpfungen
        table.integer('aufgabenpaket_id').unsigned();
        table.integer('team_id').unsigned();
        table.integer('schueler_id').unsigned();
        
        // Status (falls gewünscht)
        if (dbClient === 'mysql' || dbClient === 'pg') {
          table.enu('status', ['offen', 'in_arbeit', 'abgeschlossen', 'bewertet']).defaultTo('offen');
        } else {
          table.string('status', 20).defaultTo('offen');
        }
        
        // Bewertung
        table.integer('erreichte_punkte');
        table.text('feedback');
        table.text('abgabe_url');
        
        // Metadaten
        table.timestamps(true, true);
        
        // Fremdschlüssel
        if (dbClient !== 'sqlite') {
          table.foreign('aufgabenpaket_id').references('id').inTable('aufgabenpakete').onDelete('SET NULL');
          table.foreign('team_id').references('id').inTable('teams').onDelete('SET NULL');
          table.foreign('schueler_id').references('id').inTable('schueler').onDelete('SET NULL');
        }
      });
      console.log(' Challenges-Tabelle erstellt');
    } else {
      console.log(' Challenges-Tabelle existiert bereits');
    }

    // challenge_bilder Tabelle
    if (!(await db.schema.hasTable('challenge_bilder'))) {
      await db.schema.createTable('challenge_bilder', (table) => {
        table.increments('id').primary();
        table.integer('challenge_id').unsigned().notNullable();
        table.string('bild_url', 500).notNullable();
        table.text('beschreibung');
        table.integer('reihenfolge').defaultTo(0);
        table.timestamps(true, true);
        
        if (dbClient !== 'sqlite') {
          table.foreign('challenge_id').references('id').inTable('challenges').onDelete('CASCADE');
        }
      });
      console.log(' Challenge-Bilder-Tabelle erstellt');
    } else {
      console.log(' Challenge-Bilder-Tabelle existiert bereits');
    }

    console.log(' Datenbank-Schema erfolgreich geprüft/erstellt!');

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