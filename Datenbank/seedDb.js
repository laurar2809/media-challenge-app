// seedDb.js - SEED DATEN FÜR AUFGABENPAKETE
require('dotenv').config();
const { db } = require('../db');

async function seedAufgabenpakete() {
  try {
    console.log('Starte Seed für Aufgabenpakete...');

    // Zuerst alle vorhandenen Daten löschen (optional)
    await db('aufgabenpakete').del();
    console.log('Vorhandene Aufgabenpakete-Daten gelöscht');

    // Aufgabenpakete Daten einfügen
    const aufgabenpakete = [
      {
        id: 1,
        title: 'Video Challenge',
        description: 'Erstelle einen 1-minütigen Kurzfilm',
        icon: null,
        kategorie: 'Video'
      },
      {
        id: 2,
        title: 'Natur-Fotografie',
        description: 'Erstelle eine Fotoserie mit Hilfe der Natur.',
        icon: '/uploads/challenges/challenge-1762369815144-280383477.jpg',
        kategorie: 'Fotografie'
      },
      {
        id: 4,
        title: 'Alltags-Soundcollage',
        description: 'Erstelle eine 2-minütige Soundcollage nur mit Geräuschen aus deinem Alltag',
        icon: null,
        kategorie: 'Audio'
      },
      {
        id: 7,
        title: 'Field Recording Abenteuer',
        description: 'Nimm 10 verschiedene Naturgeräusche in deiner Umgebung auf und arrangiere sie zu einer Klanglandschaft',
        icon: '/uploads/challenges/challenge-1762415602036-866935051.jpg',
        kategorie: 'Fotografie'
      },
      {
        id: 8,
        title: 'Natur-Makrofotografie',
        description: 'Fotografiere 5 extreme Nahaufnahmen von Naturdetails in deiner Umgebung',
        icon: '/uploads/challenges/challenge-1762369929373-581095787.jpg',
        kategorie: 'Fotografie'
      },
      {
        id: 9,
        title: 'Porträt-Serie im Golden Hour',
        description: 'Erstelle eine Serie von 3 Porträtfotos während der goldenen Stunde bei Sonnenaufgang oder -untergang',
        icon: '/uploads/challenges/challenge-1762369989110-729801644.jpg',
        kategorie: 'Fotografie'
      },
      {
        id: 10,
        title: 'Urbane Architektur',
        description: 'Fotografiere geometrische Formen und Linien in der städtischen Architektur',
        icon: '/uploads/challenges/challenge-1762370894405-17861534.jpg',
        kategorie: 'Fotografie'
      },
      {
        id: 12,
        title: 'Time-Lapse Projekt',
        description: 'Erstelle einen 30-sekündigen Time-Lapse von einem natürlichen Prozess (Wolken, Pflanzen, etc.)',
        icon: '/uploads/icon-video-2.svg',
        kategorie: 'Video'
      },
      {
        id: 13,
        title: 'Tutorial Video',
        description: 'Produziere ein 3-minütiges Tutorial das eine einfache Fähigkeit erklärt',
        icon: '/uploads/icon-video-3.svg',
        kategorie: 'Video'
      },
      {
        id: 15,
        title: 'Motion Graphics Intro',
        description: 'Erstelle ein 10-sekündiges Motion Graphics Intro für einen fiktiven YouTube-Kanal',
        icon: '/uploads/icon-animation-2.svg',
        kategorie: 'Animation'
      },
      {
        id: 17,
        title: 'Ergonomisches Werkzeug',
        description: 'Entwirf ein Werkzeug mit verbesserter Ergonomie für eine spezifische Tätigkeit',
        icon: '/uploads/icon-product-2.svg',
        kategorie: 'Produktdesign'
      },
      {
        id: 18,
        title: 'Skulptur aus Metallschrott',
        description: 'Erschaffe eine kleine Skulptur aus recyceltem Metall',
        icon: '/uploads/icon-metal-1.svg',
        kategorie: 'Metallbearbeitung'
      },
      {
        id: 19,
        title: 'Praktisches Haushaltsobjekt',
        description: 'Fertige ein nützliches Objekt für den Haushalt aus Metall',
        icon: '/uploads/icon-metal-2.svg',
        kategorie: 'Metallbearbeitung'
      },
      {
        id: 20,
        title: 'Greenscreen - Kurzfilm',
        description: 'Erstelle einen Kurzfilm mit Verwendung eines Greenscreens.',
        icon: '/uploads/challenges/challenge-1761925979159-704374153.jpg',
        kategorie: 'Video'
      },
      {
        id: 26,
        title: 'Spiegelung',
        description: 'Fotografiere ein Motiv in seiner Spiegelung.',
        icon: '/uploads/challenges/challenge-1762416493305-675935441.jpg',
        kategorie: 'Fotografie'
      }
    ];

    // Daten in die Datenbank einfügen
    for (const paket of aufgabenpakete) {
      await db('aufgabenpakete').insert(paket);
    }

    console.log(`✅ ${aufgabenpakete.length} Aufgabenpakete erfolgreich eingefügt`);

    // Optional: Testabfrage um zu prüfen ob Daten korrekt eingefügt wurden
    const count = await db('aufgabenpakete').count('* as count');
    console.log(`📊 Aktuelle Anzahl Aufgabenpakete in DB: ${count[0].count}`);

  } catch (error) {
    console.error('❌ Fehler beim Seed der Aufgabenpakete:', error);
    throw error;
  }
}

async function seedCategories() {
  try {
    console.log('Starte Seed für Kategorien...');

    // Vorhandene Kategorien löschen
    await db('categories').del();

    // Standard-Kategorien einfügen
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
    console.log(`✅ ${categories.length} Kategorien erfolgreich eingefügt`);

  } catch (error) {
    console.error('❌ Fehler beim Seed der Kategorien:', error);
    throw error;
  }
}

// Haupt-Funktion
async function runSeed() {
  try {
    console.log('🚀 Starte Datenbank-Seeding...');
    
    await seedCategories();
    await seedAufgabenpakete();
    
    console.log('🎉 Datenbank-Seeding erfolgreich abgeschlossen!');
    
  } catch (error) {
    console.error('💥 Fehler beim Datenbank-Seeding:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Nur ausführen wenn direkt aufgerufen
if (require.main === module) {
  runSeed();
}

module.exports = { seedAufgabenpakete, seedCategories, runSeed };