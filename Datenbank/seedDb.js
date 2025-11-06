// seedDb.js - KOMPLETTES SEED FÜR ALLE TABELLEN
require('dotenv').config();
const { db } = require('../db');

async function seedKlassen() {
  try {
    console.log('Starte Seed für Klassen...');

    // Prüfen welche Klassen bereits existieren
    const existingKlassen = await db('klassen').select('name');
    const existingNames = existingKlassen.map(k => k.name);
    console.log('Bereits vorhandene Klassen:', existingNames);

    // Nur fehlende Klassen einfügen
    const allKlassen = ['1BHELS', '2BHELS', '3BHELS', '4BHELS', '5BHELS'];
    const missingKlassen = allKlassen.filter(name => !existingNames.includes(name));

    if (missingKlassen.length > 0) {
      const klassenToInsert = missingKlassen.map(name => ({ name }));
      await db('klassen').insert(klassenToInsert);
      console.log(`✅ ${missingKlassen.length} Klassen erfolgreich eingefügt:`, missingKlassen);
    } else {
      console.log('✅ Alle Klassen bereits vorhanden');
    }

    // Rückgabe aller Klassen (alte + neue)
    const allKlassenFromDb = await db('klassen').select('*').orderBy('name', 'asc');
    console.log('Alle Klassen in DB:', allKlassenFromDb);
    return allKlassenFromDb;

  } catch (error) {
    console.error('❌ Fehler beim Seed der Klassen:', error);
    throw error;
  }
}

async function seedSchueler(klassen) {
  try {
    console.log('Starte Seed für Schüler...');

    // DEBUG: Ausgabe der Klassen zum Prüfen
    console.log('Verfügbare Klassen für Schüler:', klassen);

    // Sicherstellen, dass Klassen gefunden werden
    const klasse1bhels = klassen.find(k => k.name === '1BHELS');
    const klasse2bhels = klassen.find(k => k.name === '2BHELS');
    const klasse3bhels = klassen.find(k => k.name === '3BHELS');
    const klasse4bhels = klassen.find(k => k.name === '4BHELS');
    const klasse5bhels = klassen.find(k => k.name === '5BHELS');

    console.log('Gefundene Klassen-IDs:', {
      '1BHELS': klasse1bhels?.id,
      '2BHELS': klasse2bhels?.id, 
      '3BHELS': klasse3bhels?.id,
      '4BHELS': klasse4bhels?.id,
      '5BHELS': klasse5bhels?.id
    });

    if (!klasse1bhels || !klasse2bhels || !klasse3bhels || !klasse4bhels || !klasse5bhels) {
      throw new Error('Nicht alle Klassen wurden gefunden!');
    }

    // Vorhandene Schüler löschen (nur Beispiel-Daten)
    await db('schueler').whereIn('vorname', ['Max', 'Anna', 'Tom', 'Lisa', 'Finn', 'Sarah', 'Lukas']).del();

    // Beispiel-Schüler mit Klassen-Zuordnung
    const schueler = [
      {
        vorname: 'Max',
        nachname: 'Mustermann',
        klasse_id: klasse1bhels.id
      },
      {
        vorname: 'Anna',
        nachname: 'Musterfrau', 
        klasse_id: klasse1bhels.id
      },
      {
        vorname: 'Tom',
        nachname: 'Schmidt',
        klasse_id: klasse2bhels.id
      },
      {
        vorname: 'Lisa',
        nachname: 'Müller',
        klasse_id: klasse2bhels.id
      },
      {
        vorname: 'Finn',
        nachname: 'Weber',
        klasse_id: klasse3bhels.id
      },
      {
        vorname: 'Sarah',
        nachname: 'Huber',
        klasse_id: klasse4bhels.id
      },
      {
        vorname: 'Lukas',
        nachname: 'Bauer',
        klasse_id: klasse5bhels.id
      }
    ];

    await db('schueler').insert(schueler);
    console.log(`✅ ${schueler.length} Beispiel-Schüler erfolgreich eingefügt`);

  } catch (error) {
    console.error('❌ Fehler beim Seed der Schüler:', error);
    throw error;
  }
}
async function seedCategories() {
  try {
    console.log('Starte Seed für Kategorien...');

    const categories = [
      {
        title: 'Fotografie',
        description: 'Challenges rund um Fotografie und Bildgestaltung',
        icon: '📷'
      },
      {
        title: 'Video', 
        description: 'Video-Produktion und Filmprojekte',
        icon: '🎥'
      },
      {
        title: 'Audio',
        description: 'Tonaufnahmen und Sounddesign', 
        icon: '🎵'
      },
      {
        title: 'Animation',
        description: '2D und 3D Animationen',
        icon: '🎬'
      },
      {
        title: 'Produktdesign',
        description: 'Design von Produkten und Objekten',
        icon: '📐'
      },
      {
        title: 'Metallbearbeitung',
        description: 'Arbeiten mit Metall und Metallverarbeitung',
        icon: '⚒️'
      }
    ];

    await db('categories').insert(categories);
    console.log(` ${categories.length} Kategorien erfolgreich eingefügt`);

  } catch (error) {
    console.error(' Fehler beim Seed der Kategorien:', error);
    throw error;
  }
}

async function seedAufgabenpakete() {
  try {
    console.log('Starte Seed für Aufgabenpakete...');

    const aufgabenpakete = [
      {
        title: 'Video Challenge',
        description: 'Erstelle einen 1-minütigen Kurzfilm',
        icon: null,
        kategorie: 'Video'
      },
      {
        title: 'Natur-Fotografie',
        description: 'Erstelle eine Fotoserie mit Hilfe der Natur.',
        icon: '/uploads/challenges/challenge-1762369815144-280383477.jpg',
        kategorie: 'Fotografie'
      },
      {
        title: 'Alltags-Soundcollage',
        description: 'Erstelle eine 2-minütige Soundcollage nur mit Geräuschen aus deinem Alltag',
        icon: null,
        kategorie: 'Audio'
      },
      {
        title: 'Field Recording Abenteuer',
        description: 'Nimm 10 verschiedene Naturgeräusche in deiner Umgebung auf und arrangiere sie zu einer Klanglandschaft',
        icon: '/uploads/challenges/challenge-1762415602036-866935051.jpg',
        kategorie: 'Fotografie'
      },
      {
        title: 'Natur-Makrofotografie',
        description: 'Fotografiere 5 extreme Nahaufnahmen von Naturdetails in deiner Umgebung',
        icon: '/uploads/challenges/challenge-1762369929373-581095787.jpg',
        kategorie: 'Fotografie'
      },
      {
        title: 'Porträt-Serie im Golden Hour',
        description: 'Erstelle eine Serie von 3 Porträtfotos während der goldenen Stunde bei Sonnenaufgang oder -untergang',
        icon: '/uploads/challenges/challenge-1762369989110-729801644.jpg',
        kategorie: 'Fotografie'
      },
      {
        title: 'Urbane Architektur',
        description: 'Fotografiere geometrische Formen und Linien in der städtischen Architektur',
        icon: '/uploads/challenges/challenge-1762370894405-17861534.jpg',
        kategorie: 'Fotografie'
      },
      {
        title: 'Time-Lapse Projekt',
        description: 'Erstelle einen 30-sekündigen Time-Lapse von einem natürlichen Prozess (Wolken, Pflanzen, etc.)',
        icon: '/uploads/icon-video-2.svg',
        kategorie: 'Video'
      },
      {
        title: 'Tutorial Video',
        description: 'Produziere ein 3-minütiges Tutorial das eine einfache Fähigkeit erklärt',
        icon: '/uploads/icon-video-3.svg',
        kategorie: 'Video'
      },
      {
        title: 'Motion Graphics Intro',
        description: 'Erstelle ein 10-sekündiges Motion Graphics Intro für einen fiktiven YouTube-Kanal',
        icon: '/uploads/icon-animation-2.svg',
        kategorie: 'Animation'
      },
      {
        title: 'Ergonomisches Werkzeug',
        description: 'Entwirf ein Werkzeug mit verbesserter Ergonomie für eine spezifische Tätigkeit',
        icon: '/uploads/icon-product-2.svg',
        kategorie: 'Produktdesign'
      },
      {
        title: 'Skulptur aus Metallschrott',
        description: 'Erschaffe eine kleine Skulptur aus recyceltem Metall',
        icon: '/uploads/icon-metal-1.svg',
        kategorie: 'Metallbearbeitung'
      },
      {
        title: 'Praktisches Haushaltsobjekt',
        description: 'Fertige ein nützliches Objekt für den Haushalt aus Metall',
        icon: '/uploads/icon-metal-2.svg',
        kategorie: 'Metallbearbeitung'
      },
      {
        title: 'Greenscreen - Kurzfilm',
        description: 'Erstelle einen Kurzfilm mit Verwendung eines Greenscreens.',
        icon: '/uploads/challenges/challenge-1761925979159-704374153.jpg',
        kategorie: 'Video'
      },
      {
        title: 'Spiegelung',
        description: 'Fotografiere ein Motiv in seiner Spiegelung.',
        icon: '/uploads/challenges/challenge-1762416493305-675935441.jpg',
        kategorie: 'Fotografie'
      }
    ];

    await db('aufgabenpakete').insert(aufgabenpakete);
    console.log(` ${aufgabenpakete.length} Aufgabenpakete erfolgreich eingefügt`);

  } catch (error) {
    console.error(' Fehler beim Seed der Aufgabenpakete:', error);
    throw error;
  }
}

// Haupt-Funktion
async function runSeed() {
  try {
    console.log(' Starte komplettes Datenbank-Seeding...');
    
    // Reihenfolge wichtig wegen Fremdschlüssel!
    const klassen = await seedKlassen();
    await seedSchueler(klassen);
    await seedCategories(); 
    await seedAufgabenpakete();
    
    console.log(' Komplettes Datenbank-Seeding erfolgreich abgeschlossen!');
    
  } catch (error) {
    console.error(' Fehler beim Datenbank-Seeding:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Nur ausführen wenn direkt aufgerufen
if (require.main === module) {
  runSeed();
}

module.exports = { 
  seedKlassen, 
  seedSchueler, 
  seedCategories, 
  seedAufgabenpakete, 
  runSeed 
};