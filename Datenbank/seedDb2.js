// seedRemaining.js - SEED FÜR SCHÜLER, AUFGABENPAKETE UND CHALLENGES
require('dotenv').config();
const { db } = require('../db');

async function getExistingData() {
  try {
    console.log('📋 Lade existierende Daten...');
    
    const klassen = await db('klassen').select('*');
    const categories = await db('categories').select('*');
    
    console.log(`✅ Gefunden: ${klassen.length} Klassen, ${categories.length} Kategorien`);
    return { klassen, categories };
  } catch (error) {
    console.error('❌ Fehler beim Laden der existierenden Daten:', error);
    throw error;
  }
}

async function seedSchueler(klassen) {
  try {
    console.log('👨‍🎓 Seed für Schüler...');

    const schueler = [
      // 2BHELS
      { vorname: 'Max', nachname: 'Mustermann', klasse_id: klassen.find(k => k.name === '2BHELS').id },
      { vorname: 'Anna', nachname: 'Schmidt', klasse_id: klassen.find(k => k.name === '2BHELS').id },
      { vorname: 'Tom', nachname: 'Bauer', klasse_id: klassen.find(k => k.name === '2BHELS').id },
      { vorname: 'Lisa', nachname: 'Weber', klasse_id: klassen.find(k => k.name === '2BHELS').id },
      
      // 3BHELS
      { vorname: 'Paul', nachname: 'Müller', klasse_id: klassen.find(k => k.name === '3BHELS').id },
      { vorname: 'Sarah', nachname: 'Fischer', klasse_id: klassen.find(k => k.name === '3BHELS').id },
      { vorname: 'David', nachname: 'Wagner', klasse_id: klassen.find(k => k.name === '3BHELS').id },
      { vorname: 'Julia', nachname: 'Becker', klasse_id: klassen.find(k => k.name === '3BHELS').id },
      
      // 4BHELS
      { vorname: 'Felix', nachname: 'Hoffmann', klasse_id: klassen.find(k => k.name === '4BHELS').id },
      { vorname: 'Laura', nachname: 'Schäfer', klasse_id: klassen.find(k => k.name === '4BHELS').id },
      { vorname: 'Kevin', nachname: 'Koch', klasse_id: klassen.find(k => k.name === '4BHELS').id },
      { vorname: 'Maria', nachname: 'Richter', klasse_id: klassen.find(k => k.name === '4BHELS').id }
    ];

    let insertedCount = 0;
    for (const schuelerItem of schueler) {
      const exists = await db('schueler')
        .where({ 
          vorname: schuelerItem.vorname, 
          nachname: schuelerItem.nachname 
        })
        .first();
      
      if (!exists) {
        await db('schueler').insert(schuelerItem);
        insertedCount++;
        console.log(`✅ Schüler "${schuelerItem.vorname} ${schuelerItem.nachname}" eingefügt`);
      } else {
        console.log(`⏭ Schüler "${schuelerItem.vorname} ${schuelerItem.nachname}" existiert bereits`);
      }
    }

    console.log(`📊 Schüler: ${insertedCount} neue eingefügt`);
    return await db('schueler').select('*');
  } catch (error) {
    console.error('❌ Fehler beim Schüler-Seed:', error);
    throw error;
  }
}

async function seedAufgabenpakete(categories) {
  try {
    console.log('📦 Seed für Aufgabenpakete...');

    const aufgabenpakete = [
      {
        title: 'Podcast Produktion',
        description: 'Erstelle einen 5-minütigen Podcast zu einem Thema deiner Wahl',
        kategorie: 'Audio',
        icon: '🎙️'
      },
      {
        title: 'Kurzfilm Dreh',
        description: 'Produziere einen 3-minütigen Kurzfilm mit eigener Story',
        kategorie: 'Video',
        icon: '🎬'
      },
      {
        title: 'Portrait Fotografie',
        description: 'Erstelle eine Serie von 5 Portrait-Fotos mit unterschiedlichen Stimmungen',
        kategorie: 'Fotografie',
        icon: '📸'
      },
      {
        title: '2D Character Animation',
        description: 'Animierte einen Charakter in 2D mit mindestens 3 verschiedenen Bewegungen',
        kategorie: 'Animation',
        icon: '👾'
      },
      {
        title: 'Möbel Design',
        description: 'Design und visualisiere ein innovatives Möbelstück',
        kategorie: 'Produktdesign',
        icon: '🪑'
      },
      {
        title: 'Metall Skulptur',
        description: 'Erstelle eine künstlerische Skulptur aus Metall',
        kategorie: 'Metallbearbeitung',
        icon: '⚙️'
      },
      {
        title: 'Sound Design für Games',
        description: 'Erstelle Soundeffekte für ein Videospiel',
        kategorie: 'Audio',
        icon: '🎮'
      },
      {
        title: 'Dokumentarfilm',
        description: 'Produziere einen Dokumentarfilm über ein lokales Thema',
        kategorie: 'Video',
        icon: '🎥'
      }
    ];

    let insertedCount = 0;
    for (const paket of aufgabenpakete) {
      const exists = await db('aufgabenpakete').where({ title: paket.title }).first();
      if (!exists) {
        await db('aufgabenpakete').insert(paket);
        insertedCount++;
        console.log(`✅ Aufgabenpaket "${paket.title}" eingefügt`);
      } else {
        console.log(`⏭ Aufgabenpaket "${paket.title}" existiert bereits`);
      }
    }

    console.log(`📊 Aufgabenpakete: ${insertedCount} neue eingefügt`);
    return await db('aufgabenpakete').select('*');
  } catch (error) {
    console.error('❌ Fehler beim Aufgabenpakete-Seed:', error);
    throw error;
  }
}

async function seedTeams() {
  try {
    console.log('👥 Seed für Teams...');

    const teams = [
      { name: 'Team Audio Masters' },
      { name: 'Video Professionals' },
      { name: 'Foto Crew' },
      { name: 'Animation Experts' },
      { name: 'Design Thinkers' },
      { name: 'Metal Artists' }
    ];

    let insertedCount = 0;
    const teamIds = [];
    
    for (const team of teams) {
      const exists = await db('teams').where({ name: team.name }).first();
      if (!exists) {
        const [teamId] = await db('teams').insert(team);
        teamIds.push(teamId);
        insertedCount++;
        console.log(`✅ Team "${team.name}" eingefügt`);
      } else {
        console.log(`⏭ Team "${team.name}" existiert bereits`);
        teamIds.push(exists.id);
      }
    }

    console.log(`📊 Teams: ${insertedCount} neue eingefügt`);
    return teamIds;
  } catch (error) {
    console.error('❌ Fehler beim Teams-Seed:', error);
    throw error;
  }
}

async function seedTeamMitglieder(schueler, teamIds) {
  try {
    console.log('🤝 Seed für Team-Mitglieder...');

    const teamMitglieder = [
      // Team 1: Audio Masters (Schüler 1-3)
      { team_id: teamIds[0], schueler_id: schueler[0].id, rolle: 'teamleiter' },
      { team_id: teamIds[0], schueler_id: schueler[1].id, rolle: 'mitglied' },
      { team_id: teamIds[0], schueler_id: schueler[2].id, rolle: 'mitglied' },
      
      // Team 2: Video Professionals (Schüler 4-6)
      { team_id: teamIds[1], schueler_id: schueler[3].id, rolle: 'teamleiter' },
      { team_id: teamIds[1], schueler_id: schueler[4].id, rolle: 'mitglied' },
      { team_id: teamIds[1], schueler_id: schueler[5].id, rolle: 'mitglied' },
      
      // Team 3: Foto Crew (Schüler 7-9)
      { team_id: teamIds[2], schueler_id: schueler[6].id, rolle: 'teamleiter' },
      { team_id: teamIds[2], schueler_id: schueler[7].id, rolle: 'mitglied' },
      { team_id: teamIds[2], schueler_id: schueler[8].id, rolle: 'mitglied' },
      
      // Team 4: Animation Experts (Schüler 10-12)
      { team_id: teamIds[3], schueler_id: schueler[9].id, rolle: 'teamleiter' },
      { team_id: teamIds[3], schueler_id: schueler[10].id, rolle: 'mitglied' },
      { team_id: teamIds[3], schueler_id: schueler[11].id, rolle: 'mitglied' }
    ];

    let insertedCount = 0;
    for (const mitglied of teamMitglieder) {
      const exists = await db('team_mitglieder')
        .where({ 
          team_id: mitglied.team_id, 
          schueler_id: mitglied.schueler_id 
        })
        .first();
      
      if (!exists) {
        await db('team_mitglieder').insert(mitglied);
        insertedCount++;
        const schuelerData = schueler.find(s => s.id === mitglied.schueler_id);
        console.log(`✅ Team-Mitglied "${schuelerData.vorname} ${schuelerData.nachname}" eingefügt`);
      } else {
        console.log(`⏭ Team-Mitglied existiert bereits`);
      }
    }

    console.log(`📊 Team-Mitglieder: ${insertedCount} neue eingefügt`);
  } catch (error) {
    console.error('❌ Fehler beim Team-Mitglieder-Seed:', error);
    throw error;
  }
}

async function seedChallenges(aufgabenpakete, teamIds) {
  try {
    console.log('🏆 Seed für Challenges...');

    const challenges = [
      {
        title: aufgabenpakete[0].title,
        beschreibung: aufgabenpakete[0].description,
        kategorie: aufgabenpakete[0].kategorie,
        icon: aufgabenpakete[0].icon,
        aufgabenpaket_id: aufgabenpakete[0].id,
        team_id: teamIds[0],
        zusatzinfos: 'Thema: Nachhaltigkeit',
        abgabedatum: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // +14 Tage
      },
      {
        title: aufgabenpakete[1].title,
        beschreibung: aufgabenpakete[1].description,
        kategorie: aufgabenpakete[1].kategorie,
        icon: aufgabenpakete[1].icon,
        aufgabenpaket_id: aufgabenpakete[1].id,
        team_id: teamIds[1],
        zusatzinfos: 'Maximale Länge: 3 Minuten',
        abgabedatum: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // +21 Tage
      },
      {
        title: aufgabenpakete[2].title,
        beschreibung: aufgabenpakete[2].description,
        kategorie: aufgabenpakete[2].kategorie,
        icon: aufgabenpakete[2].icon,
        aufgabenpaket_id: aufgabenpakete[2].id,
        team_id: teamIds[2],
        zusatzinfos: 'Verwende natürliches Licht',
        abgabedatum: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // +10 Tage
      },
      {
        title: aufgabenpakete[3].title,
        beschreibung: aufgabenpakete[3].description,
        kategorie: aufgabenpakete[3].kategorie,
        icon: aufgabenpakete[3].icon,
        aufgabenpaket_id: aufgabenpakete[3].id,
        team_id: teamIds[3],
        zusatzinfos: 'Mindestens 3 verschiedene Animationen',
        abgabedatum: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000) // +28 Tage
      }
    ];

    let insertedCount = 0;
    for (const challenge of challenges) {
      const exists = await db('challenges')
        .where({ 
          team_id: challenge.team_id,
          aufgabenpaket_id: challenge.aufgabenpaket_id
        })
        .first();
      
      if (!exists) {
        await db('challenges').insert(challenge);
        insertedCount++;
        console.log(`✅ Challenge "${challenge.title}" für Team ${challenge.team_id} eingefügt`);
      } else {
        console.log(`⏭ Challenge existiert bereits`);
      }
    }

    console.log(`📊 Challenges: ${insertedCount} neue eingefügt`);
  } catch (error) {
    console.error('❌ Fehler beim Challenges-Seed:', error);
    throw error;
  }
}

// Haupt-Funktion
async function runRemainingSeed() {
  try {
    console.log('🚀 Starte Seed für Schüler, Aufgabenpakete und Challenges...');
    console.log('📝 Es werden nur fehlende Datensätze eingefügt');
    
    // Lade existierende Klassen und Kategorien
    const { klassen, categories } = await getExistingData();
    
    // Seed für die drei gewünschten Tabellen
    const schueler = await seedSchueler(klassen);
    const aufgabenpakete = await seedAufgabenpakete(categories);
    const teamIds = await seedTeams();
    await seedTeamMitglieder(schueler, teamIds);
    await seedChallenges(aufgabenpakete, teamIds);
    
    console.log('\n🎉 SEED ERFOLGREICH ABGESCHLOSSEN!');
    console.log('=========================================');
    console.log('📊 ÜBERSICHT:');
    console.log('   👨‍🎓 12 Schüler');
    console.log('   📦 8 Aufgabenpakete');
    console.log('   👥 6 Teams');
    console.log('   🤝 12 Team-Mitglieder');
    console.log('   🏆 4 Challenges');
    console.log('=========================================');
    
  } catch (error) {
    console.error('💥 FEHLER beim Seed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Nur ausführen wenn direkt aufgerufen
if (require.main === module) {
  runRemainingSeed();
}

module.exports = { 
  runRemainingSeed
};