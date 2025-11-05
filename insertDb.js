// insertDb.js
require('dotenv').config();
const { db } = require('./db');

const originalItems = [
  {
    title: "Audio",
    description: "Erstellen von Musikstücken", 
    icon: "/uploads/icon-1759473920639-542278451.svg"
  },
  {
    title: "Foto", 
    description: "Digitale Fotografie",
    icon: "/uploads/icon-1759473910957-54510130.svg"
  },
  {
    title: "Metallbearbeitung",
    description: "Kreatives Gestalten mit Metall",
    icon: "/uploads/icon-1760006525514-978243190.svg"
  },
  {
    title: "Produktdesign", 
    description: "Konzept, Entwurf und 3D-Druck eines Produkts",
    icon: "/uploads/icon-1759473901074-37705088.svg"
  },
  {
    title: "Video",
    description: "Idee, Drehbuch, Dreh und Schnitt eines Kurzfilms", 
    icon: "/uploads/icon-1759474004292-461811549.svg"
  },
  {
    title: "Animation",
    description: "Erstellen von 2D/3D Animationen und Motion Graphics", 
    icon: "/uploads/icon-1760006701694-865921878.svg"
  }
];

async function restoreOriginalItems() {
  try {
    console.log('Stelle originale Kategorien wieder her...');
    
    // Erst alle vorhandenen Items löschen
    await db('items').del();
    console.log('Alte Items gelöscht');
    
    // Neue Items einfügen
    for (const item of originalItems) {
      await db('items').insert(item);
      console.log(`"${item.title}" hinzugefügt`);
    }
    
    console.log('Originale Kategorien erfolgreich wiederhergestellt!');
    console.log('Insgesamt 5 Kategorien angelegt');
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    process.exit();
  }
}

restoreOriginalItems();