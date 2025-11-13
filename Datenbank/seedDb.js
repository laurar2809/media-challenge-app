// seedDb.js - NUR KATEGORIEN UND KLASSEN
require('dotenv').config();
const { db } = require('../db');

async function seedKlassen() {
  try {
    console.log(' Seed für Klassen...');

    const klassen = [
      { name: '2BHELS' },
      { name: '3BHELS' },
      { name: '4BHELS' }
    ];

    let insertedCount = 0;
    for (const klasse of klassen) {
      const exists = await db('klassen').where({ name: klasse.name }).first();
      if (!exists) {
        await db('klassen').insert(klasse);
        insertedCount++;
        console.log(` Klasse "${klasse.name}" eingefügt`);
      } else {
        console.log(` Klasse "${klasse.name}" existiert bereits`);
      }
    }

    console.log(` Klassen: ${insertedCount} neue eingefügt`);
    return await db('klassen').select('*');
  } catch (error) {
    console.error(' Fehler beim Klassen-Seed:', error);
    throw error;
  }
}

async function seedCategories() {
  try {
    console.log(' Seed für Kategorien...');

    const categories = [
      {
        title: 'Audio',
        description: 'Tonaufnahmen und Sounddesign',
        icon: '🎵'
      },
      {
        title: 'Video',
        description: 'Video-Produktion und Filmprojekte',
        icon: '🎥'
      },
      {
        title: 'Fotografie',
        description: 'Challenges rund um Fotografie und Bildgestaltung',
        icon: '📷'
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

    let insertedCount = 0;
    for (const category of categories) {
      const exists = await db('categories').where({ title: category.title }).first();
      if (!exists) {
        await db('categories').insert(category);
        insertedCount++;
        console.log(` Kategorie "${category.title}" eingefügt`);
      } else {
        console.log(`⏭ Kategorie "${category.title}" existiert bereits`);
      }
    }

    console.log(` Kategorien: ${insertedCount} neue eingefügt`);
  } catch (error) {
    console.error(' Fehler beim Kategorien-Seed:', error);
    throw error;
  }
}

// Haupt-Funktion
async function runSeed() {
  try {
    console.log(' Starte Seed für Kategorien und Klassen...');
    console.log('  Es werden nur fehlende Kategorien und Klassen eingefügt');
    
    await seedKlassen();
    await seedCategories();
    
    console.log(' Seed erfolgreich abgeschlossen!');
    console.log(' Übersicht:');
    console.log('   - 3 Klassen (2BHELS, 3BHELS, 4BHELS)');
    console.log('   - 6 Kategorien (Audio, Video, Fotografie, Animation, Produktdesign, Metallbearbeitung)');
    
  } catch (error) {
    console.error(' Fehler beim Seed:', error);
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
  seedCategories,
  runSeed 
};