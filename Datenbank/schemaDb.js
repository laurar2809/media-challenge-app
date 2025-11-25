// schemaDb.js - Universelles Datenbank-Schema für SQLite & MySQL
require('dotenv').config();
const { db } = require('../db');

async function createSchema() {
  try {
    const dbClient = process.env.DB_CLIENT || 'sqlite';
    console.log(`📦 Erstelle Datenbank-Schema für ${dbClient.toUpperCase()}...`);

    // Helper function für ENUM-Erstellung
    const createEnum = (table, columnName, values, defaultValue = null) => {
      if (dbClient === 'sqlite') {
        // SQLite unterstützt kein ENUM, verwende TEXT mit CHECK constraint
        let column = table.string(columnName, 20);
        if (defaultValue) column.defaultTo(defaultValue);
        // CHECK constraint wird später hinzugefügt
      } else {
        // MySQL/PostgreSQL unterstützen ENUM
        table.enu(columnName, values, { useNative: true, enumName: `${columnName}_enum` }).defaultTo(defaultValue);
      }
    };

    // Helper function für Fremdschlüssel
    const addForeignKey = (table, column, references, onDelete = 'SET NULL') => {
      if (dbClient !== 'sqlite') {
        table.foreign(column).references('id').inTable(references).onDelete(onDelete);
      }
    };

    // categories Tabelle
    if (!(await db.schema.hasTable('categories'))) {
      await db.schema.createTable('categories', (table) => {
        table.increments('id').primary();
        table.string('title', 255).notNullable();
        table.text('description').notNullable();
        table.string('icon', 500);
        table.timestamps(true, true);
      });
      console.log('✅ Categories-Tabelle erstellt');
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
        table.date('start_date').nullable();
        table.date('end_date').nullable();
        table.timestamps(true, true);
      });
      console.log('✅ Aufgabenpakete-Tabelle erstellt');
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
          table.integer('aktiv').defaultTo(1); // SQLite verwendet INTEGER für Boolean
        } else {
          table.boolean('aktiv').defaultTo(true);
        }
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('✅ Schuljahre-Tabelle erstellt');
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
      console.log('✅ Klassen-Tabelle erstellt');
    } else {
      console.log('⏭ Klassen-Tabelle existiert bereits');
    }

    // schueler Tabelle
    if (!(await db.schema.hasTable('schueler'))) {
      await db.schema.createTable('schueler', (table) => {
        table.increments('id').primary();
        table.string('vorname', 100).notNullable();
        table.string('nachname', 100).notNullable();
        table.integer('klasse_id').unsigned();
        table.integer('schuljahr_id').unsigned();
        table.timestamps(true, true);
        
        addForeignKey(table, 'klasse_id', 'klassen');
        addForeignKey(table, 'schuljahr_id', 'schuljahre');
      });
      console.log('✅ Schueler-Tabelle erstellt');
    } else {
      console.log('⏭ Schueler-Tabelle existiert bereits');
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
      console.log('✅ Teams-Tabelle erstellt');
    } else {
      console.log('⏭ Teams-Tabelle existiert bereits');
    }

    // team_mitglieder Tabelle
    if (!(await db.schema.hasTable('team_mitglieder'))) {
      await db.schema.createTable('team_mitglieder', (table) => {
        table.increments('id').primary();
        table.integer('team_id').unsigned().notNullable();
        table.integer('schueler_id').unsigned().notNullable();
        
        // ENUM für Rolle
        if (dbClient === 'sqlite') {
          table.string('rolle', 20).defaultTo('mitglied');
        } else {
          table.enu('rolle', ['mitglied', 'teamleiter']).defaultTo('mitglied');
        }
        
        table.timestamp('created_at').defaultTo(db.fn.now());
        
        addForeignKey(table, 'team_id', 'teams', 'CASCADE');
        addForeignKey(table, 'schueler_id', 'schueler', 'CASCADE');
        
        // Unique constraint für Team-Mitglied Kombination
        table.unique(['team_id', 'schueler_id']);
      });
      
      // Für SQLite: CHECK constraint für Rolle
      if (dbClient === 'sqlite') {
        // SQLite unterstützt kein ALTER TABLE ADD CONSTRAINT, daher muss es manuell gemacht werden
        // Dies ist ein Workaround - in der Praxis wird der Constraint oft weggelassen
        console.log('ℹ️  SQLite: CHECK constraint für Rolle muss manuell hinzugefügt werden');
      }
      
      console.log('✅ Team-Mitglieder-Tabelle erstellt');
    } else {
      console.log('⏭ Team-Mitglieder-Tabelle existiert bereits');
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
        addForeignKey(table, 'schueler_id', 'schueler');
        addForeignKey(table, 'schuljahr_id', 'schuljahre');
      });
      console.log('✅ Challenges-Tabelle erstellt');
    } else {
      console.log('⏭ Challenges-Tabelle existiert bereits');
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
      console.log('✅ Challenge-Bilder-Tabelle erstellt');
    } else {
      console.log('⏭ Challenge-Bilder-Tabelle existiert bereits');
    }

    console.log('🎉 Datenbank-Schema erfolgreich geprüft/erstellt!');

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Schemas:', error);
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