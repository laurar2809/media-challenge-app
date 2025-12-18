// schemaDb.js - Universelles Datenbank-Schema für SQLite & MySQL
require('dotenv').config();
const { db } = require('../db');

async function createSchema() {
  try {
    const dbClient = process.env.DB_CLIENT || 'sqlite';
    console.log(` Erstelle Datenbank-Schema für ${dbClient.toUpperCase()}...`);

    // Helper function für Fremdschlüssel
    const addForeignKey = (table, column, references, onDelete = 'SET NULL') => {
      if (dbClient !== 'sqlite') {
        table.foreign(column).references('id').inTable(references).onDelete(onDelete);
      }
    };

    // user_roles Tabelle - NEU
    if (!(await db.schema.hasTable('user_roles'))) {
      await db.schema.createTable('user_roles', (table) => {
        table.increments('id').primary();
        table.string('rolle', 50).notNullable().unique();
        table.timestamps(true, true);
      });
      console.log(' User_Roles-Tabelle erstellt');
    } else {
      console.log(' User_Roles-Tabelle existiert bereits');
    }

    // users Tabelle - NEU (ersetzt schueler)
    if (!(await db.schema.hasTable('users'))) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.integer('user_role_id').unsigned().notNullable().defaultTo(1); // Default = Schüler
        table.string('vorname', 100).notNullable();
        table.string('nachname', 100).notNullable();
        table.integer('klasse_id').unsigned();
        table.integer('schuljahr_id').unsigned();
        table.timestamps(true, true);
        
        addForeignKey(table, 'user_role_id', 'user_roles');
        addForeignKey(table, 'klasse_id', 'klassen');
        addForeignKey(table, 'schuljahr_id', 'schuljahre');
      });
      console.log(' Users-Tabelle erstellt');
    } else {
      console.log(' Users-Tabelle existiert bereits');
    }

    // categories Tabelle
    if (!(await db.schema.hasTable('categories'))) {
      await db.schema.createTable('categories', (table) => {
        table.increments('id').primary();
        table.string('title', 255).notNullable();
        table.text('description').notNullable();
        table.string('icon', 500);
        table.timestamps(true, true);
      });
      console.log('Categories-Tabelle erstellt');
    } else {
      console.log('Categories-Tabelle existiert bereits');
    }

    // aufgabenpakete Tabelle
    if (!(await db.schema.hasTable('aufgabenpakete'))) {
      await db.schema.createTable('aufgabenpakete', (table) => {
        table.increments('id').primary();
        table.string('title', 255).notNullable();
        table.text('description').notNullable();
        table.string('kategorie', 255).notNullable();
        table.string('icon', 500);
        table.date('start_date').nullable();
        table.date('end_date').nullable();
        table.timestamps(true, true);
      });
      console.log(' Aufgabenpakete-Tabelle erstellt');
    } else {
      console.log('⏭ Aufgabenpakete-Tabelle existiert bereits');
    }

    // schuljahre Tabelle
    if (!(await db.schema.hasTable('schuljahre'))) {
      await db.schema.createTable('schuljahre', (table) => {
        table.increments('id').primary();
        table.string('name', 20).notNullable().unique();
        table.integer('startjahr').notNullable();
        table.integer('endjahr').notNullable();
        if (dbClient === 'sqlite') {
          table.integer('aktiv').defaultTo(1);
        } else {
          table.boolean('aktiv').defaultTo(true);
        }
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log(' Schuljahre-Tabelle erstellt');
    } else {
      console.log('⏭ Schuljahre-Tabelle existiert bereits');
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
      console.log('⏭ Klassen-Tabelle existiert bereits');
    }

    // teams Tabelle
    if (!(await db.schema.hasTable('teams'))) {
      await db.schema.createTable('teams', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.text('beschreibung');
        table.integer('schuljahr_id').unsigned();
        table.timestamps(true, true);
        
        addForeignKey(table, 'schuljahr_id', 'schuljahre');
      });
      console.log(' Teams-Tabelle erstellt');
    } else {
      console.log(' Teams-Tabelle existiert bereits');
    }

    // team_mitglieder Tabelle - ANGEPASST (schueler_id → user_id)
    if (!(await db.schema.hasTable('team_mitglieder'))) {
      await db.schema.createTable('team_mitglieder', (table) => {
        table.increments('id').primary();
        table.integer('team_id').unsigned().notNullable();
        table.integer('user_id').unsigned().notNullable(); // GEÄNDERT: schueler_id → user_id
        
        // ENUM für Rolle
        if (dbClient === 'sqlite') {
          table.string('rolle', 20).defaultTo('mitglied');
        } else {
          table.enu('rolle', ['mitglied', 'teamleiter']).defaultTo('mitglied');
        }
        
        table.timestamp('created_at').defaultTo(db.fn.now());
        
        addForeignKey(table, 'team_id', 'teams', 'CASCADE');
        addForeignKey(table, 'user_id', 'users', 'CASCADE'); // GEÄNDERT: schueler → users
        
        // Unique constraint für Team-Mitglied Kombination
        table.unique(['team_id', 'user_id']);
      });
      
      console.log(' Team-Mitglieder-Tabelle erstellt');
    } else {
      console.log('⏭ Team-Mitglieder-Tabelle existiert bereits');
    }

    // challenges Tabelle - ANGEPASST (schueler_id → user_id)
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
        table.integer('user_id').unsigned(); // GEÄNDERT: schueler_id → user_id
        table.integer('schuljahr_id').unsigned();
        
        // Status
        if (dbClient === 'sqlite') {
          table.string('status', 20).defaultTo('offen');
        } else {
          table.enu('status', ['offen', 'in_arbeit', 'abgeschlossen', 'bewertet']).defaultTo('offen');
        }
        
        // Bewertung
        table.integer('erreichte_punkte');
        table.text('feedback');
        table.text('abgabe_url');
        
        // Metadaten
        table.timestamps(true, true);
        
        // Fremdschlüssel
        addForeignKey(table, 'aufgabenpaket_id', 'aufgabenpakete');
        addForeignKey(table, 'team_id', 'teams');
        addForeignKey(table, 'user_id', 'users'); // GEÄNDERT: schueler → users
        addForeignKey(table, 'schuljahr_id', 'schuljahre');
      });
      console.log(' Challenges-Tabelle erstellt');
    } else {
      console.log('Challenges-Tabelle existiert bereits');
    }

    // challenge_bilder Tabelle
    if (!(await db.schema.hasTable('challenge_bilder'))) {
      await db.schema.createTable('challenge_bilder', (table) => {
        table.increments('id').primary();
        table.integer('challenge_id').unsigned().notNullable();
        table.string('bild_url', 500).notNullable();
        table.text('beschreibung');
        table.integer('reihenfolge').defaultTo(0);
        table.timestamp('created_at').defaultTo(db.fn.now());
        
        addForeignKey(table, 'challenge_id', 'challenges', 'CASCADE');
      });
      console.log(' Challenge-Bilder-Tabelle erstellt');
    } else {
      console.log('⏭ Challenge-Bilder-Tabelle existiert bereits');
    }

    console.log(' Datenbank-Schema erfolgreich geprüft/erstellt!');

  } catch (error) {
    console.error(' Fehler beim Erstellen des Schemas:', error);
    throw error;
  }
}

if (require.main === module) {
  createSchema().then(() => {
    console.log('Schema creation completed');
    process.exit(0);
  }).catch(error => {
    console.error('Schema creation failed:', error);
    process.exit(1);
  });
}

module.exports = { createSchema };