// createSchueler.js - Erstellt 100 Schüler für Klassen 2, 3 und 4 BHELS
require('dotenv').config();
const { db } = require('./db');

// Zufällige Vornamen und Nachnamen für realistische Testdaten
const vornamen = [
  'Max', 'Anna', 'Lena', 'Paul', 'Sophie', 'Felix', 'Emma', 'Leon', 'Hannah', 'Lukas',
  'Mia', 'Jonas', 'Laura', 'Tim', 'Sarah', 'Tom', 'Julia', 'David', 'Lisa', 'Simon',
  'Marie', 'Philipp', 'Katharina', 'Moritz', 'Johanna', 'Alexander', 'Nina', 'Jan', 'Vanessa', 'Michael',
  'Christina', 'Sebastian', 'Melanie', 'Patrick', 'Sabrina', 'Daniel', 'Stefanie', 'Christian', 'Jennifer', 'Kevin',
  'Nicole', 'Markus', 'Jessica', 'Andreas', 'Franziska', 'Stefan', 'Carolin', 'Tobias', 'Nadine', 'Martin',
  'Marina', 'Klaus', 'Petra', 'Wolfgang', 'Monika', 'Jürgen', 'Birgit', 'Frank', 'Kerstin', 'Peter',
  'Heike', 'Uwe', 'Angelika', 'Ralf', 'Susanne', 'Bernd', 'Katrin', 'Matthias', 'Doris', 'Thomas',
  'Silke', 'Holger', 'Renate', 'Dirk', 'Anja', 'Jens', 'Tanja', 'Sven', 'Bettina', 'Marcus',
  'Yvonne', 'Rainer', 'Martina', 'Thorsten', 'Sabine', 'Mike', 'Karin', 'Olaf', 'Sonja', 'Robert',
  'Andrea', 'Marcel', 'Ramona', 'Roland', 'Annette', 'René', 'Ines', 'Henry', 'Eva', 'Benjamin'
];

const nachnamen = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann',
  'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier',
  'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Köhler', 'Herrmann', 'König', 'Walter', 'Mayer', 'Huber',
  'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung', 'Hahn', 'Schubert',
  'Vogel', 'Friedrich', 'Keller', 'Günther', 'Frank', 'Berger', 'Winkler', 'Roth', 'Beck', 'Lorenz',
  'Baumann', 'Franke', 'Albrecht', 'Ludwig', 'Winter', 'Simon', 'Kraus', 'Böhm', 'Schuster', 'Marx',
  'Schulte', 'Fiedler', 'Thiel', 'Gruber', 'Seidel', 'Kuhn', 'Brunner', 'Otto', 'Moser', 'Arnold',
  'Sauer', 'Thomas', 'Pfeiffer', 'Graf', 'Martin', 'Nowak', 'Jäger', 'Stein', 'Sommer', 'Groß'
];

const klassen = ['2 BHELS', '3 BHELS', '4 BHELS'];

async function createSchueler() {
  try {
    console.log('🚀 Starte Erstellung von 100 Schülern...');
    
    // Prüfen ob Klassen existieren, sonst erstellen
    for (const klassenName of klassen) {
      let klasse = await db('klassen').where({ name: klassenName }).first();
      
      if (!klasse) {
        console.log(`📝 Erstelle Klasse: ${klassenName}`);
        const [klasseId] = await db('klassen').insert({
          name: klassenName
        });
        klasse = { id: klasseId, name: klassenName };
      }
      
      console.log(`✅ Klasse ${klassenName} ist bereit (ID: ${klasse.id})`);
    }

    // Schüler erstellen
    const schuelerData = [];
    
    for (let i = 0; i < 100; i++) {
      const vorname = vornamen[Math.floor(Math.random() * vornamen.length)];
      const nachname = nachnamen[Math.floor(Math.random() * nachnamen.length)];
      
      // Zufällige Klasse auswählen (nur 2, 3, 4 BHELS)
      const klassenName = klassen[Math.floor(Math.random() * klassen.length)];
      const klasse = await db('klassen').where({ name: klassenName }).first();
      
      schuelerData.push({
        vorname: vorname,
        nachname: nachname,
        klasse_id: klasse.id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Schüler in die Datenbank einfügen
    await db('schueler').insert(schuelerData);
    
    console.log('✅ Erfolg! 100 Schüler wurden erstellt:');
    
    // Statistik anzeigen
    for (const klassenName of klassen) {
      const klasse = await db('klassen').where({ name: klassenName }).first();
      const count = await db('schueler').where({ klasse_id: klasse.id }).count('* as total');
      console.log(`   📊 ${klassenName}: ${count[0].total} Schüler`);
    }
    
    const totalCount = await db('schueler').count('* as total');
    console.log(`\n🎉 Gesamt: ${totalCount[0].total} Schüler in der Datenbank`);
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Schüler:', error);
  } finally {
    await db.destroy();
    console.log('🔚 Datenbankverbindung geschlossen');
  }
}

// Skript ausführen
createSchueler();