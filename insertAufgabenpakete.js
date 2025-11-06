// insertChallenges.js
require('dotenv').config();
const { db } = require('./db');

const challenges = [
  // Audio Challenges
  {
    title: "Alltags-Soundcollage",
    description: "Erstelle eine 2-minütige Soundcollage nur mit Geräuschen aus deinem Alltag",
    kategorie: "Audio",
    icon: null
  },
  {
    title: "Field Recording Abenteuer", 
    description: "Nimm 10 verschiedene Naturgeräusche in deiner Umgebung auf und arrangiere sie zu einer Klanglandschaft",
    kategorie: "Audio",
    icon: null
  },
  {
  title: "Natur-Makrofotografie",
  description: "Fotografiere 5 extreme Nahaufnahmen von Naturdetails in deiner Umgebung",
  kategorie: "Foto", 
  icon: "/uploads/icon-foto-1.svg"
},

{
title: "Porträt-Serie im Golden Hour",
description: "Erstelle eine Serie von 3 Porträtfotos während der goldenen Stunde bei Sonnenaufgang oder -untergang",
kategorie: "Foto",
icon: "/uploads/icon-foto-2.svg"
},

{
title: "Urbane Architektur",
description: "Fotografiere geometrische Formen und Linien in der städtischen Architektur",
kategorie: "Foto",
icon: "/uploads/icon-foto-3.svg"
},
{
  title: "1-Minuten Kurzfilm",
  description: "Produziere einen 60-sekündigen Kurzfilm mit Anfang, Mitte und Ende",
  kategorie: "Video",
  icon: "/uploads/icon-video-1.svg"
},

{
  title: "Time-Lapse Projekt",
  description: "Erstelle einen 30-sekündigen Time-Lapse von einem natürlichen Prozess (Wolken, Pflanzen, etc.)",
  kategorie: "Video", 
  icon: "/uploads/icon-video-2.svg"
},

{
  title: "Tutorial Video",
  description: "Produziere ein 3-minütiges Tutorial das eine einfache Fähigkeit erklärt",
  kategorie: "Video",
  icon: "/uploads/icon-video-3.svg"
},

{
  title: "2D Character Animation",
  description: "Animiere einen einfachen Charakter der eine Emotion ausdrückt",
  kategorie: "Animation",
  icon: "/uploads/icon-animation-1.svg"
},

{
  title: "Motion Graphics Intro",
  description: "Erstelle ein 10-sekündiges Motion Graphics Intro für einen fiktiven YouTube-Kanal",
  kategorie: "Animation",
  icon: "/uploads/icon-animation-2.svg"
},
{
  title: "3D-druckbares Objekt",
  description: "Design ein alltägliches Objekt das mit 3D-Druck produziert werden kann",
  kategorie: "Produktdesign",
  icon: "/uploads/icon-product-1.svg"
},

{
  title: "Ergonomisches Werkzeug",
  description: "Entwirf ein Werkzeug mit verbesserter Ergonomie für eine spezifische Tätigkeit",
  kategorie: "Produktdesign", 
  icon: "/uploads/icon-product-2.svg"
},
{
  title: "Skulptur aus Metallschrott",
  description: "Erschaffe eine kleine Skulptur aus recyceltem Metall",
  kategorie: "Metallbearbeitung",
  icon: "/uploads/icon-metal-1.svg"
},

{
  title: "Praktisches Haushaltsobjekt",
  description: "Fertige ein nützliches Objekt für den Haushalt aus Metall",
  kategorie: "Metallbearbeitung",
  icon: "/uploads/icon-metal-2.svg"
}
  // Weitere Challenges hier einfügen...
];

async function insertChallenges() {
  try {
    console.log('Füge Beispiel-Challenges ein...');
    
    for (const challenge of challenges) {
      await db('challenges').insert(challenge);
      console.log(`"${challenge.title}" hinzugefügt`);
    }
    
    console.log('Beispiel-Challenges erfolgreich eingefügt!');
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    process.exit();
  }
}

insertChallenges();