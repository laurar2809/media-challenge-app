const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Challenges Übersicht mit Filterung
router.get('/', async (req, res) => {
  try {
    const { kategorie, search, schuljahr } = req.query;
    
    let query = db('challenges')
      .leftJoin('schuljahre', 'challenges.schuljahr_id', 'schuljahre.id')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id');

    // Schuljahr Filter
    if (schuljahr && schuljahr !== 'alle') {
      query = query.where('schuljahre.name', schuljahr);
    }

    // Filter nach Kategorie
    if (kategorie && kategorie !== 'alle') {
      query = query.where('aufgabenpakete.kategorie', kategorie);
    }

    // Suche nach Teams/Aufgabenpaketen
    if (search && search.length >= 2) {
      query = query.where(function() {
        this.where('aufgabenpakete.title', 'like', `%${search}%`)
             .orWhere('teams.name', 'like', `%${search}%`)
             .orWhere('aufgabenpakete.kategorie', 'like', `%${search}%`);
      });
    }

    // Kategorien und Schuljahre laden
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');
    
    let challenges;
    const dbClient = process.env.DB_CLIENT || 'sqlite';
    
    if (dbClient === 'sqlite') {
      // SQLITE VERSION
      challenges = await query
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'aufgabenpakete.icon as aufgabenpaket_icon',
          'teams.name as team_name',
          'schuljahre.name as schuljahr_name'
        )
        .orderBy('challenges.created_at', 'desc');
      
      // Team-Mitglieder separat abfragen
      for (let challenge of challenges) {
        if (challenge.team_id) {
          const mitglieder = await db('team_mitglieder')
            .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
            .where('team_mitglieder.team_id', challenge.team_id)
            .select('schueler.vorname', 'schueler.nachname');
          
          challenge.team_mitglieder_names = mitglieder
            .map(m => `${m.vorname} ${m.nachname}`)
            .join(', ');
        }
      }
    } else {
      // MYSQL VERSION
      challenges = await query
        .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
        .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'aufgabenpakete.icon as aufgabenpaket_icon',
          'teams.name as team_name',
          'schuljahre.name as schuljahr_name',
          db.raw("GROUP_CONCAT(CONCAT(schueler.vorname, ' ', schueler.nachname) SEPARATOR ', ') as team_mitglieder_names")
        )
        .groupBy('challenges.id')
        .orderBy('challenges.created_at', 'desc');
    }
    
    res.render('challenges', { 
      challenges, 
      kategorien,
      schuljahre,
      activeKategorie: kategorie || 'alle',
      activeSchuljahr: schuljahr || 'alle',
      searchTerm: search || '',
      activePage: 'challenges' 
    });
    
  } catch (error) {
    console.error("Fehler beim Laden der challenges:", error);
    
    // Fehlerbehandlung mit allen Variablen
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');
    
    res.render('challenges', { 
      challenges: [], 
      kategorien: kategorien,
      schuljahre: schuljahre,
      activeKategorie: 'alle',
      activeSchuljahr: 'alle',
      searchTerm: '',
      activePage: 'challenges' 
    });
  }
});

// Challenges nach Kategorie filtern
router.get('/filter/:kategorie', async (req, res) => {
  try {
    const kategorie = req.params.kategorie;
    
    let query = db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('aufgabenpakete.kategorie', kategorie);

    // Kategorien und Schuljahre laden
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    let challenges;
    const dbClient = process.env.DB_CLIENT || 'sqlite';
    
    if (dbClient === 'sqlite') {
      // SQLITE VERSION - MIT AUFGABENPAKET ICON
      challenges = await query
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'aufgabenpakete.icon as aufgabenpaket_icon',
          'teams.name as team_name',
        )
        .orderBy('challenges.created_at', 'desc');
      
      // Team-Mitglieder separat abfragen
      for (let challenge of challenges) {
        if (challenge.team_id) {
          const mitglieder = await db('team_mitglieder')
            .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
            .where('team_mitglieder.team_id', challenge.team_id)
            .select('schueler.vorname', 'schueler.nachname');
          
          challenge.team_mitglieder_names = mitglieder
            .map(m => `${m.vorname} ${m.nachname}`)
            .join(', ');
        }
      }
    } else {
      // MYSQL VERSION - MIT AUFGABENPAKET ICON
      challenges = await query
        .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
        .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'aufgabenpakete.icon as aufgabenpaket_icon',
          'teams.name as team_name',
          db.raw("GROUP_CONCAT(CONCAT(schueler.vorname, ' ', schueler.nachname) SEPARATOR ', ') as team_mitglieder_names")
        )
        .groupBy('challenges.id')
        .orderBy('challenges.created_at', 'desc');
    }
    
    // Alle Variablen korrekt übergeben
    res.render('challenges', { 
      challenges, 
      kategorien,
      schuljahre,
      activeKategorie: kategorie,
      activeSchuljahr: 'alle',
      searchTerm: '',
      activePage: 'challenges' 
    });
    
  } catch (error) {
    console.error("Fehler beim Filtern der challenges:", error);
    req.flash('error', 'Fehler beim Filtern der Challenges');
    res.redirect('/challenges');
  }
});

// NEUE DETAIL-ROUTE FÜR CHALLENGES - KORRIGIERT
router.get('/detail/:id', async (req, res) => {
  try {
    const challengeId = req.params.id;
    
    console.log('Lade Challenge Details für ID:', challengeId);
    
    // Challenge mit allen notwendigen Daten laden - OHNE teams.beschreibung
    const challenge = await db('challenges')
      .leftJoin('schuljahre', 'challenges.schuljahr_id', 'schuljahre.id')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('challenges.id', challengeId)
      .select(
        'challenges.*',
        'aufgabenpakete.title as aufgabenpaket_title',
        'aufgabenpakete.description as aufgabenpaket_description',
        'aufgabenpakete.kategorie',
        'aufgabenpakete.icon as aufgabenpaket_icon',
        'teams.name as team_name',
        // 'teams.beschreibung as team_beschreibung', // ❌ DIESE SPALTE EXISTIERT NICHT
        'schuljahre.name as schuljahr_name'
      )
      .first();

    if (!challenge) {
      console.log('Challenge nicht gefunden für ID:', challengeId);
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }

    console.log('Challenge gefunden:', challenge.aufgabenpaket_title);

    // Team-Mitglieder laden
    if (challenge.team_id) {
      const mitglieder = await db('team_mitglieder')
        .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
        .where('team_mitglieder.team_id', challenge.team_id)
        .select('schueler.vorname', 'schueler.nachname');
      
      challenge.team_mitglieder_names = mitglieder
        .map(m => `${m.vorname} ${m.nachname}`)
        .join(', ');
      
      console.log('Team-Mitglieder geladen:', challenge.team_mitglieder_names);
    }

    // Team-Beschreibung auf null setzen (da Spalte nicht existiert)
    challenge.team_beschreibung = null;

    res.render('challengesDetail', {
      challenge: challenge,
      activePage: 'challenges'
    });

  } catch (error) {
    console.error('Fehler beim Laden der Challenge-Details:', error);
    req.flash('error', 'Fehler beim Laden der Challenge-Details.');
    res.redirect('/challenges');
  }
});


// Neues Challenge Formular
router.get('/new', async (req, res) => {
  try {
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const teams = await db('teams').select('*').orderBy('name', 'asc');
    const schueler = await db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .select('schueler.*', 'klassen.name as klasse_name')
      .orderBy('schueler.nachname', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');
    res.render('formChallenges', {
      item: {},
      aufgabenpakete,
      teams,
      schueler,
      schuljahre,
      existingTeam: [], 
      action: '/challenges',
      title: 'Neue Challenge erstellen',
      activePage: 'challenges'
    });
  } catch (error) {
    console.error("Fehler:", error);
    req.flash('error', 'Fehler beim Laden des Formulars.');
    res.redirect('/challenges');
  }
});




// Challenge speichern
router.post('/', async (req, res) => {
  try {
    const { aufgabenpaket_id, teams_data, zusatzinfos, abgabedatum } = req.body;
    
    console.log('📝 Empfangene Daten:', req.body);
    
    // Validierung
    if (!aufgabenpaket_id) {
      req.flash('error', 'Aufgabenpaket ist erforderlich.');
      return res.redirect('/challenges/new');
    }
    
    if (!teams_data) {
      req.flash('error', 'Mindestens ein Team ist erforderlich.');
      return res.redirect('/challenges/new');
    }
    
    // Parse teams data
    let teams;
    try {
      teams = JSON.parse(teams_data);
    } catch (e) {
      console.error(' Fehler beim Parsen der Team-Daten:', e);
      req.flash('error', 'Ungültige Team-Daten.');
      return res.redirect('/challenges/new');
    }
    
    if (!Array.isArray(teams) || teams.length === 0) {
      req.flash('error', 'Mindestens ein Team ist erforderlich.');
      return res.redirect('/challenges/new');
    }
    
    // Hole das ausgewählte Aufgabenpaket
    const aufgabenpaket = await db('aufgabenpakete').where({ id: aufgabenpaket_id }).first();
    if (!aufgabenpaket) {
      req.flash('error', 'Ausgewähltes Aufgabenpaket nicht gefunden.');
      return res.redirect('/challenges/new');
    }
    
    // TRANSACTION START
    const trx = await db.transaction();
    
    try {
      const challengeIds = [];
      
      // Für jedes Team eine Challenge erstellen
      for (const teamData of teams) {
        console.log(' Erstelle Team:', teamData.name, 'Mitglieder:', teamData.mitglieder.length);
        
        // 1. Team erstellen
        const [teamId] = await trx('teams').insert({
          name: teamData.name,
          //beschreibung: teamData.beschreibung || null
        });
        
        // 2. Schüler dem Team zuweisen
        const teamMitglieder = teamData.mitglieder.map((mitglied, index) => ({
          team_id: teamId,
          schueler_id: mitglied.id,
          rolle: index === 0 ? 'teamleiter' : 'mitglied'
        }));
        
        await trx('team_mitglieder').insert(teamMitglieder);
        
        // 3. Challenge erstellen
        const [challengeId] = await trx('challenges').insert({
          title: aufgabenpaket.title,
          beschreibung: aufgabenpaket.description,
          kategorie: aufgabenpaket.kategorie,
          icon: aufgabenpaket.icon,
          zusatzinfos: zusatzinfos || null,
          abgabedatum: abgabedatum || null,
          team_id: teamId,
          aufgabenpaket_id: aufgabenpaket_id,
        });
        
        challengeIds.push(challengeId);
      }
      
      // Alles erfolgreich - Commit
      await trx.commit();
      
      req.flash('success', `Erfolgreich ${teams.length} Team(s) mit Challenges erstellt!`);
      res.redirect('/challenges');
      
    } catch (error) {
      // Bei Fehler - Rollback
      await trx.rollback();
      console.error(' Datenbank-Fehler:', error);
      req.flash('error', 'Datenbank-Fehler: ' + error.message);
      res.redirect('/challenges/new');
    }
    
  } catch (error) {
    console.error(' Allgemeiner Fehler:', error);
    req.flash('error', 'Fehler beim Erstellen: ' + error.message);
    res.redirect('/challenges/new');
  }
});

// Challenge bearbeiten Formular
router.get('/:id/edit', async (req, res) => {
  try {
    console.log(' Lade Challenge für Bearbeitung...');
    
    // 1. Challenge mit allen notwendigen Joins laden
    const challenge = await db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('challenges.id', req.params.id)
      .first();
    
    if (!challenge) {
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }
    
    console.log(' Challenge geladen:', challenge);
    
    // 2. Team-Mitglieder MIT SCHÜLER-DATEN laden
    const teamMitglieder = await db('team_mitglieder')
      .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .where({ team_id: challenge.team_id })
      .select(
        'team_mitglieder.schueler_id',
        'team_mitglieder.rolle',
        'schueler.vorname',
        'schueler.nachname',
        'klassen.name as klasse_name'
      );
    
    console.log(' Team-Mitglieder geladen:', teamMitglieder);
    
    // 3. Team-Struktur für das Formular erstellen
    const existingTeam = {
      id: 'existing-team-1', // ID für JavaScript
      name: challenge.name, // Team-Name aus teams Tabelle
      beschreibung: challenge.beschreibung, // Team-Beschreibung
      mitglieder: teamMitglieder.map(m => ({
        id: m.schueler_id,
        vorname: m.vorname,
        nachname: m.nachname,
        klasse: m.klasse_name,
        rolle: m.rolle
      }))
    };
    
    console.log(' Team-Struktur erstellt:', existingTeam);
    
    // 4. Alle benötigten Daten für das Formular laden
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const schueler = await db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .select('schueler.*', 'klassen.name as klasse_name')
      .orderBy('schueler.nachname', 'asc');
    
   const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');
    
    // 5. ALLE Daten an das Template übergeben
    res.render('formChallenges', {
      item: {
        // Challenge Daten
        id: challenge.id,
        aufgabenpaket_id: challenge.aufgabenpaket_id,
        zusatzinfos: challenge.zusatzinfos,
        abgabedatum: challenge.abgabedatum,
        schuljahr_id: challenge.schuljahr_id,
        
        // Team Daten
        team_name: challenge.name,
        team_beschreibung: challenge.beschreibung,
        
        // Schüler IDs als Array (für einfache Select-Box falls benötigt)
        schueler_ids: teamMitglieder.map(m => m.schueler_id.toString())
      },
      aufgabenpakete,
      schueler,
      schuljahre,
      existingTeam: [existingTeam], 
      action: `/challenges/${challenge.id}?_method=PUT`,
      title: 'Challenge bearbeiten',
      activePage: 'challenges'
    });
    
  } catch (error) {
    console.error(" Fehler beim Laden der Challenge:", error);
    req.flash('error', 'Fehler beim Laden der Challenge.');
    res.redirect('/challenges');
  }
});

router.put('/:id', async (req, res) => {
  try {
    console.log('=== CHALLENGE UPDATE START ===');
    console.log('Request Body:', req.body);
    
    const { aufgabenpaket_id, zusatzinfos, abgabedatum, schuljahr_id, teams_data } = req.body;
    
    // Validierung
    if (!aufgabenpaket_id || !teams_data || !schuljahr_id) {
      console.log('Validierung fehlgeschlagen');
      req.flash('error', 'Aufgabenpaket, Teams und Schuljahr sind erforderlich.');
      return res.redirect(`/challenges/${req.params.id}/edit`);
    }

    // Parse teams_data
    let teams;
    try {
      teams = JSON.parse(teams_data);
    } catch (e) {
      console.error('Fehler beim Parsen von teams_data:', e);
      req.flash('error', 'Ungültige Team-Daten.');
      return res.redirect(`/challenges/${req.params.id}/edit`);
    }

    if (!Array.isArray(teams) || teams.length === 0) {
      req.flash('error', 'Mindestens ein Team ist erforderlich.');
      return res.redirect(`/challenges/${req.params.id}/edit`);
    }

    const firstTeam = teams[0];

    // TRANSACTION START
    const trx = await db.transaction();
    
    try {
      // 1. Challenge finden
      const challenge = await trx('challenges').where({ id: req.params.id }).first();
      
      if (!challenge) {
        await trx.rollback();
        req.flash('error', 'Challenge nicht gefunden.');
        return res.redirect('/challenges');
      }

      // 2. Team aktualisieren
      await trx('teams').where({ id: challenge.team_id }).update({
        name: firstTeam.name,
        //beschreibung: firstTeam.beschreibung || null
      });

      // 3. Alte Team-Mitglieder löschen
      await trx('team_mitglieder').where({ team_id: challenge.team_id }).del();

      // 4. Neue Team-Mitglieder hinzufügen
      const teamMitglieder = firstTeam.mitglieder.map((mitglied, index) => ({
        team_id: challenge.team_id,
        schueler_id: mitglied.id,
        rolle: index === 0 ? 'teamleiter' : 'mitglied'
      }));
      
      await trx('team_mitglieder').insert(teamMitglieder);

      // 5. Challenge aktualisieren
      await trx('challenges').where({ id: req.params.id }).update({
        aufgabenpaket_id: aufgabenpaket_id,
        zusatzinfos: zusatzinfos || null,
        abgabedatum: abgabedatum || null,
        schuljahr_id: schuljahr_id
      });

      await trx.commit();
      console.log('Transaction committed');

      req.flash('success', 'Challenge erfolgreich aktualisiert.');
      res.redirect('/challenges');
      
    } catch (error) {
      await trx.rollback();
      console.error('Transaction Error:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('Allgemeiner Fehler:', error);
    req.flash('error', 'Fehler beim Aktualisieren: ' + error.message);
    res.redirect(`/challenges/${req.params.id}/edit`);
  }
});

// Challenge löschen
router.delete('/:id', async (req, res) => {
  try {
    const challengeId = parseInt(req.params.id);
    
    // TRANSACTION START - Alles oder nichts
    const trx = await db.transaction();
    
    try {
      // 1. Challenge finden (mit Team-ID)
      const challenge = await trx('challenges').where({ id: challengeId }).first();
      
      if (!challenge) {
        await trx.rollback();
        req.flash('error', 'Challenge nicht gefunden.');
        return res.redirect('/challenges');
      }
      
      const teamId = challenge.team_id;
      
      // 2. Challenge löschen
      await trx('challenges').where({ id: challengeId }).del();
      
      // 3. Team-Mitglieder löschen
      await trx('team_mitglieder').where({ team_id: teamId }).del();
      
      // 4. Team löschen
      await trx('teams').where({ id: teamId }).del();
      
      // Alles erfolgreich - Commit
      await trx.commit();
      
      req.flash('success', 'Challenge und Team erfolgreich gelöscht.');
      res.redirect('/challenges');
      
    } catch (error) {
      // Bei Fehler - Rollback
      await trx.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error(' Fehler beim Löschen:', error);
    req.flash('error', 'Fehler beim Löschen: ' + error.message);
    res.redirect('/challenges');
  }
});





module.exports = router;