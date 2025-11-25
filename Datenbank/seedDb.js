// seedDb.js - Seed-Daten für Media Challenge System
require('dotenv').config();
const { db } = require('./db');

async function seedDatabase() {
  try {
    console.log('🌱 Starte mit dem Befüllen der Datenbank...');

    // Schuljahre einfügen
    console.log('📅 Füge Schuljahre hinzu...');
    const schuljahreExists = await db('schuljahre').select('id').first();
    if (!schuljahreExists) {
      await db('schuljahre').insert([
        { name: '2023/24', startjahr: 2023, endjahr: 2024, aktiv: true },
        { name: '2024/25', startjahr: 2024, endjahr: 2025, aktiv: true },
        { name: '2025/26', startjahr: 2025, endjahr: 2026, aktiv: false }
      ]);
      console.log('✅ Schuljahre eingefügt');
    } else {
      console.log('⏭ Schuljahre existieren bereits');
    }

    // Klassen einfügen
    console.log('🏫 Füge Klassen hinzu...');
    const klassenExists = await db('klassen').select('id').first();
    if (!klassenExists) {
      await db('klassen').insert([
        { name: '2BHELS' },
        { name: '3BHELS' },
        { name: '4BHELS' }
      ]);
      console.log('✅ Klassen eingefügt');
    } else {
      console.log('⏭ Klassen existieren bereits');
    }

    // Schüler einfügen
    console.log('👥 Füge Schüler hinzu...');
    const schuelerExists = await db('schueler').select('id').first();
    if (!schuelerExists) {
      const klassen = await db('klassen').select('id', 'name');
      const schuljahre = await db('schuljahre').where('aktiv', true).select('id');
      const aktuellesSchuljahr = schuljahre[0]?.id;

      // Klassen-IDs mappen
      const klasseMap = {};
      klassen.forEach(k => {
        klasseMap[k.name] = k.id;
      });

      const schuelerData = [
        // 2BHELS Schüler
        { vorname: 'Tom', nachname: 'Schmidt', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Lisa', nachname: 'Müller', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Lukas', nachname: 'Bauer', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Tobias', nachname: 'Müller', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Holger', nachname: 'Graf', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Bernd', nachname: 'Vogel', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Patrick', nachname: 'Jung', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Ines', nachname: 'Müller', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Marina', nachname: 'Schmid', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Melanie', nachname: 'Schmitz', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Sven', nachname: 'Lehmann', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Olaf', nachname: 'Schäfer', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Hannah', nachname: 'Lange', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Birgit', nachname: 'Winkler', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Henry', nachname: 'Fuchs', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Daniel', nachname: 'Groß', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Tim', nachname: 'Jung', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Lena', nachname: 'Maier', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Lena', nachname: 'Stein', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Silke', nachname: 'Groß', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Ralf', nachname: 'Stein', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Hannah', nachname: 'Schmid', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Bernd', nachname: 'Jäger', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Sophie', nachname: 'Schröder', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Michael', nachname: 'Schulte', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Katrin', nachname: 'Hofmann', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Sabine', nachname: 'Winter', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Ralf', nachname: 'Möller', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Klaus', nachname: 'Keller', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Paul', nachname: 'Becker', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Monika', nachname: 'Beck', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Philipp', nachname: 'Schulze', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Hannah', nachname: 'Lehmann', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Philipp', nachname: 'Wolf', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Henry', nachname: 'Henrison', klasse_id: klasseMap['2BHELS'], schuljahr_id: aktuellesSchuljahr },

        // 3BHELS Schüler
        { vorname: 'Max', nachname: 'Mustermann', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Finn', nachname: 'Weber', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Laura', nachname: 'Rachbauer', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Paul', nachname: 'Hartmann', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Ramona', nachname: 'Müller', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Jonas', nachname: 'Hahn', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Marcel', nachname: 'Peters', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Ramona', nachname: 'Schröder', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Andrea', nachname: 'Hartmann', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Felix', nachname: 'Weiß', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Emma', nachname: 'Winter', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Ramona', nachname: 'Winkler', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Bernd', nachname: 'Berger', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Mia', nachname: 'Schulze', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Tobias', nachname: 'Fiedler', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Simon', nachname: 'Jäger', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Stefan', nachname: 'Schulze', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Petra', nachname: 'Schneider', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Anna', nachname: 'Maier', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Andreas', nachname: 'Simon', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Jessica', nachname: 'Arnold', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Lisa', nachname: 'Jäger', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Silke', nachname: 'Schulte', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Henry', nachname: 'Becker', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Anja', nachname: 'Simon', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Jens', nachname: 'Herrmann', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Lena', nachname: 'Hoffmann', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Jens', nachname: 'Koch', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Stefanie', nachname: 'Marx', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Katrin', nachname: 'Zimmermann', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Tim', nachname: 'Winter', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Silke', nachname: 'Köhler', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Tobias', nachname: 'Fuchs', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Heike', nachname: 'Schröder', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Thorsten', nachname: 'Schulte', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Martina', nachname: 'Herrmann', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Lukas', nachname: 'Wolf', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Wolfgang', nachname: 'Braun', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Jens', nachname: 'Thiel', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Martin', nachname: 'Koch', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Kevin', nachname: 'Jäger', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Anja', nachname: 'Moser', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Vanessa', nachname: 'Roth', klasse_id: klasseMap['3BHELS'], schuljahr_id: aktuellesSchuljahr },

        // 4BHELS Schüler
        { vorname: 'Mirjam', nachname: 'Brunner', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Anna', nachname: 'Musterfrau', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Sarah', nachname: 'Huber', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Lena', nachname: 'Pöckelhofer', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Nina', nachname: 'Lorenz', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Bettina', nachname: 'Schmid', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Heike', nachname: 'Roth', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Katrin', nachname: 'Gruber', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Marcel', nachname: 'Wagner', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Henry', nachname: 'Müller', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Mike', nachname: 'Klein', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Tanja', nachname: 'Böhm', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'René', nachname: 'Schmid', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Thomas', nachname: 'Schulte', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Hannah', nachname: 'Schäfer', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Mike', nachname: 'Schröder', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Eva', nachname: 'Beck', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Sebastian', nachname: 'Martin', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Robert', nachname: 'Thomas', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Annette', nachname: 'Friedrich', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Uwe', nachname: 'Schuster', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Carolin', nachname: 'Braun', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Patrick', nachname: 'Krüger', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Robert', nachname: 'Schmid', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Katharina', nachname: 'Koch', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Stefan', nachname: 'Ludwig', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Bernd', nachname: 'Simon', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Tobias', nachname: 'Lorenz', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Laura', nachname: 'Müller', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Patrick', nachname: 'Zimmermann', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr },
        { vorname: 'Patrick', nachname: 'Kuhn', klasse_id: klasseMap['4BHELS'], schuljahr_id: aktuellesSchuljahr }
      ];

      await db('schueler').insert(schuelerData);
      console.log(`✅ ${schuelerData.length} Schüler eingefügt`);
    } else {
      console.log('⏭ Schüler existieren bereits');
    }

    // Teams einfügen
    console.log('👥 Füge Teams hinzu...');
    const teamsExists = await db('teams').select('id').first();
    if (!teamsExists) {
      const schuljahre = await db('schuljahre').where('aktiv', true).select('id');
      const aktuellesSchuljahr = schuljahre[0]?.id;

      await db('teams').insert([
        { name: 'Team1', schuljahr_id: aktuellesSchuljahr },
        { name: 'Team2', schuljahr_id: aktuellesSchuljahr },
        { name: 'Team3', schuljahr_id: aktuellesSchuljahr },
        { name: 'Team 5', schuljahr_id: aktuellesSchuljahr },
        { name: 'Team 6', schuljahr_id: aktuellesSchuljahr },
        { name: 'Team 7', schuljahr_id: aktuellesSchuljahr },
        { name: 'Team 8', schuljahr_id: aktuellesSchuljahr }
      ]);
      console.log('✅ Teams eingefügt');
    } else {
      console.log('⏭ Teams existieren bereits');
    }

    // Team-Mitglieder einfügen
    console.log('🔗 Füge Team-Mitglieder hinzu...');
    const teamMitgliederExists = await db('team_mitglieder').select('id').first();
    if (!teamMitgliederExists) {
      // Hole Schüler-IDs für bekannte Namen
      const schueler = await db('schueler')
        .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
        .select('schueler.id', 'schueler.vorname', 'schueler.nachname', 'klassen.name as klasse');

      const teams = await db('teams').select('id', 'name');

      // Helper function to find student ID
      const findSchuelerId = (vorname, nachname, klasse = null) => {
        const found = schueler.find(s => 
          s.vorname === vorname && 
          s.nachname === nachname && 
          (!klasse || s.klasse === klasse)
        );
        return found ? found.id : null;
      };

      // Helper function to find team ID
      const findTeamId = (name) => {
        const found = teams.find(t => t.name === name);
        return found ? found.id : null;
      };

      const teamMitgliederData = [
        // Team1
        { team_id: findTeamId('Team1'), schueler_id: findSchuelerId('Lukas', 'Bauer', '2BHELS'), rolle: 'teamleiter' },
        { team_id: findTeamId('Team1'), schueler_id: findSchuelerId('Max', 'Mustermann', '3BHELS'), rolle: 'mitglied' },
        
        // Team2
        { team_id: findTeamId('Team2'), schueler_id: findSchuelerId('Mirjam', 'Brunner', '4BHELS'), rolle: 'teamleiter' },
        { team_id: findTeamId('Team2'), schueler_id: findSchuelerId('Lena', 'Pöckelhofer', '4BHELS'), rolle: 'mitglied' },
        { team_id: findTeamId('Team2'), schueler_id: findSchuelerId('Laura', 'Rachbauer', '3BHELS'), rolle: 'mitglied' },
        
        // Team3
        { team_id: findTeamId('Team3'), schueler_id: findSchuelerId('Lukas', 'Bauer', '2BHELS'), rolle: 'teamleiter' },
        
        // Team 5
        { team_id: findTeamId('Team 5'), schueler_id: findSchuelerId('Lukas', 'Wolf', '3BHELS'), rolle: 'teamleiter' },
        { team_id: findTeamId('Team 5'), schueler_id: findSchuelerId('Katrin', 'Zimmermann', '3BHELS'), rolle: 'mitglied' },
        
        // Team 6
        { team_id: findTeamId('Team 6'), schueler_id: findSchuelerId('Jens', 'Thiel', '3BHELS'), rolle: 'teamleiter' },
        { team_id: findTeamId('Team 6'), schueler_id: findSchuelerId('Robert', 'Thomas', '4BHELS'), rolle: 'mitglied' },
        
        // Team 7
        { team_id: findTeamId('Team 7'), schueler_id: findSchuelerId('Bettina', 'Schmid', '4BHELS'), rolle: 'teamleiter' },
        { team_id: findTeamId('Team 7'), schueler_id: findSchuelerId('Heike', 'Roth', '4BHELS'), rolle: 'mitglied' },
        
        // Team 8
        { team_id: findTeamId('Team 8'), schueler_id: findSchuelerId('Philipp', 'Schulze', '2BHELS'), rolle: 'teamleiter' },
        { team_id: findTeamId('Team 8'), schueler_id: findSchuelerId('Ralf', 'Möller', '2BHELS'), rolle: 'mitglied' }
      ].filter(item => item.team_id && item.schueler_id); // Filter out any null values

      if (teamMitgliederData.length > 0) {
        await db('team_mitglieder').insert(teamMitgliederData);
        console.log(`✅ ${teamMitgliederData.length} Team-Mitglieder eingefügt`);
      } else {
        console.log('⚠️ Keine Team-Mitglieder eingefügt (Schüler/Teams nicht gefunden)');
      }
    } else {
      console.log('⏭ Team-Mitglieder existieren bereits');
    }

    console.log('🎉 Datenbank-Befüllung abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler beim Befüllen der Datenbank:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase().then(() => {
    console.log('Seed completed');
    process.exit(0);
  }).catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}

module.exports = { seedDatabase };