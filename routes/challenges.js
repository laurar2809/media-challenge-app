// routes/challenges.js - OHNE beschreibung
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

// Challenges Übersicht - ADMIN: alles, SCHÜLER: nur eigene
router.get('/', requireAuth, async (req, res) => {
  try {
    let challenges;

    if (req.currentUser.user_role_id === 1) { // Schüler
      console.log(` Lade Challenges für Schüler ${req.currentUser.vorname}`);

      // Schüler-Logik - nur eigene Challenges
      const userTeams = await req.db('team_mitglieder')
        .where('user_id', req.currentUser.id)
        .pluck('team_id');

      if (userTeams.length > 0) {
        challenges = await req.db('challenges')
          .whereIn('team_id', userTeams)
          .select('*')
          .orderBy('created_at', 'desc');
      } else {
        challenges = [];
      }

      // Schüler bekommt die einfache View
      res.render('challenges/index', {
        title: 'Challenges',
        activePage: 'challenges',
        challenges
      });

    } else { // Lehrer/Admin - KOMPLETTE FUNKTION MIT ALLEN JOINS
      console.log(`👨‍🏫 Lade ALLE Challenges für ${req.currentUser.rolle}`);

      // VOLLSTÄNDIGE QUERY MIT ALLEN JOINS
      let challengesQuery = req.db('challenges')
        .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
        .leftJoin('teams', 'challenges.team_id', 'teams.id')
        .leftJoin('schuljahre', 'challenges.schuljahr_id', 'schuljahre.id')
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.icon as aufgabenpaket_icon',
          'aufgabenpakete.description as aufgabenpaket_description',
          'teams.name as team_name',
          'schuljahre.name as schuljahr_name'
        )
        .orderBy('challenges.created_at', 'desc');

      // Hole zusätzlich Team-Mitglieder für jede Challenge
      const allChallenges = await challengesQuery;

      // Für jede Challenge die Team-Mitglieder laden
      const challengesWithMembers = await Promise.all(
        allChallenges.map(async (challenge) => {
          if (challenge.team_id) {
            const mitglieder = await req.db('team_mitglieder')
              .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
              .where('team_mitglieder.team_id', challenge.team_id)
              .select(
                'users.vorname',
                'users.nachname'
              );

            // Namen der Mitglieder als String zusammenfassen
            challenge.team_mitglieder_names = mitglieder
              .map(m => `${m.vorname} ${m.nachname}`)
              .join(', ');
          } else {
            challenge.team_mitglieder_names = '';
          }

          return challenge;
        })
      );

      // Hole Filter-Daten
      const [kategorien, schuljahre, teams] = await Promise.all([
        req.db('categories').select('*'),
        req.db('schuljahre').select('*'),
        req.db('teams').select('*')
      ]);

      // Setze ALLE Filter-Werte (mit Defaults)
      const activeKategorie = req.query.kategorie || 'alle';
      const activeSchuljahr = req.query.schuljahr || 'alle';
      const searchTerm = req.query.search || '';

      // Filtere Challenges
      let gefilterteChallenges = challengesWithMembers;

      // Kategorie-Filter
      if (activeKategorie !== 'alle') {
        gefilterteChallenges = gefilterteChallenges.filter(c => c.kategorie === activeKategorie);
      }

      // Schuljahr-Filter
      if (activeSchuljahr !== 'alle') {
        gefilterteChallenges = gefilterteChallenges.filter(c => c.schuljahr_name === activeSchuljahr);
      }

      // Such-Filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        gefilterteChallenges = gefilterteChallenges.filter(c =>
          c.title.toLowerCase().includes(searchLower) ||
          c.beschreibung.toLowerCase().includes(searchLower) ||
          c.kategorie.toLowerCase().includes(searchLower) ||
          (c.aufgabenpaket_title && c.aufgabenpaket_title.toLowerCase().includes(searchLower)) ||
          (c.team_name && c.team_name.toLowerCase().includes(searchLower)) ||
          (c.team_mitglieder_names && c.team_mitglieder_names.toLowerCase().includes(searchLower))
        );
      }

      console.log(` Gefundene Challenges: ${gefilterteChallenges.length} (gefiltert von ${allChallenges.length})`);

      // Debug: Zeige erste Challenge mit allen Daten
      if (gefilterteChallenges.length > 0) {
        console.log('🔍 Erste Challenge mit allen Daten:', {
          title: gefilterteChallenges[0].title,
          team_id: gefilterteChallenges[0].team_id,
          team_name: gefilterteChallenges[0].team_name,
          team_mitglieder: gefilterteChallenges[0].team_mitglieder_names,
          aufgabenpaket_title: gefilterteChallenges[0].aufgabenpaket_title,
          aufgabenpaket_icon: gefilterteChallenges[0].aufgabenpaket_icon
        });
      }

      // Admin/Lehrer bekommt die ORIGINALE View mit ALLEN Funktionen
      res.render('challenges', {
        title: 'Challenges',
        activePage: 'challenges',
        challenges: gefilterteChallenges,
        kategorien,
        schuljahre,
        teams,
        activeKategorie,
        activeSchuljahr,
        searchTerm
      });
    }

  } catch (error) {
    console.error('Challenges Fehler:', error);
    res.status(500).send('Server Fehler');
  }
});

// Challenges Übersicht
router.get('/', async (req, res) => {
  try {
    const { kategorie, search, schuljahr } = req.query;

    let query = db('challenges')
      .leftJoin('schuljahre', 'challenges.schuljahr_id', 'schuljahre.id')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id');

    if (schuljahr && schuljahr !== 'alle') {
      query = query.where('schuljahre.name', schuljahr);
    }

    if (kategorie && kategorie !== 'alle') {
      query = query.where('aufgabenpakete.kategorie', kategorie);
    }

    if (search && search.length >= 2) {
      query = query.where(function () {
        this.where('aufgabenpakete.title', 'like', `%${search}%`)
          .orWhere('teams.name', 'like', `%${search}%`)
          .orWhere('aufgabenpakete.kategorie', 'like', `%${search}%`);
      });
    }

    const challenges = await query
      .select(
        'challenges.*',
        'aufgabenpakete.title as aufgabenpaket_title',
        'aufgabenpakete.kategorie',
        'aufgabenpakete.icon as aufgabenpaket_icon',
        'teams.name as team_name',
        'schuljahre.name as schuljahr_name'
      )
      .orderBy('challenges.created_at', 'desc');

    // Team-Mitglieder laden
    for (let challenge of challenges) {
      if (challenge.team_id) {
        const mitglieder = await db('team_mitglieder')
          .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
          .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
          .where('team_mitglieder.team_id', challenge.team_id)
          .where('users.user_role_id', 1)
          .select(
            'users.id',
            'users.vorname',
            'users.nachname',
            'klassen.name as klasse_name'
          );

        challenge.team_mitglieder_names = mitglieder
          .map(m => `${m.vorname} ${m.nachname}`)
          .join(', ');
      } else {
        challenge.team_mitglieder_names = 'Kein Team';
      }
    }

    const kategorien = await db('categories').select('*').orderBy('title', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

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
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    res.render('challenges', {
      challenges: [],
      kategorien,
      schuljahre,
      activeKategorie: 'alle',
      activeSchuljahr: 'alle',
      searchTerm: '',
      activePage: 'challenges'
    });
  }
});

// Neue Challenge Formular
router.get('/new', async (req, res) => {
  try {
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const schueler = await db('users')
      .where('user_role_id', 1)
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .select('users.*', 'klassen.name as klasse_name')
      .orderBy('users.nachname', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    res.render('formChallenges', {
      item: {},
      aufgabenpakete,
      teams: [],
      schueler,
      schuljahre,
      existingTeam: [],
      action: '/challenges',
      title: 'Neue Challenge erstellen',
      activePage: 'challenges'
    });

  } catch (error) {
    console.error("Fehler beim Laden des Formulars:", error);
    req.flash('error', 'Fehler beim Laden des Formulars');
    res.redirect('/challenges');
  }
});

// Challenge speichern - OHNE beschreibung
router.post('/', async (req, res) => {
  try {
    const { aufgabenpaket_id, teams_data, zusatzinfos, abgabedatum, schuljahr_id } = req.body;

    // Validierung
    if (!aufgabenpaket_id || !teams_data || !schuljahr_id) {
      req.flash('error', 'Aufgabenpaket, Teams und Schuljahr sind erforderlich.');
      return res.redirect('/challenges/new');
    }

    let teams;
    try {
      teams = JSON.parse(teams_data);
    } catch (e) {
      req.flash('error', 'Ungültige Team-Daten.');
      return res.redirect('/challenges/new');
    }

    if (!Array.isArray(teams) || teams.length === 0) {
      req.flash('error', 'Mindestens ein Team ist erforderlich.');
      return res.redirect('/challenges/new');
    }

    const aufgabenpaket = await db('aufgabenpakete').where({ id: aufgabenpaket_id }).first();
    if (!aufgabenpaket) {
      req.flash('error', 'Ausgewähltes Aufgabenpaket nicht gefunden.');
      return res.redirect('/challenges/new');
    }

    // TRANSACTION START
    const trx = await db.transaction();

    try {
      for (const teamData of teams) {
        // 1. Team erstellen - NUR name
        const [teamId] = await trx('teams').insert({
          name: teamData.name
        });

        // 2. Schüler dem Team zuweisen
        const teamMitglieder = teamData.mitglieder.map((mitglied, index) => ({
          team_id: teamId,
          user_id: mitglied.id,
          rolle: index === 0 ? 'teamleiter' : 'mitglied'
        }));

        await trx('team_mitglieder').insert(teamMitglieder);

        // 3. Challenge erstellen
        await trx('challenges').insert({
          title: aufgabenpaket.title,
          beschreibung: aufgabenpaket.description,
          kategorie: aufgabenpaket.kategorie,
          icon: aufgabenpaket.icon,
          zusatzinfos: zusatzinfos || null,
          abgabedatum: abgabedatum || null,
          team_id: teamId,
          aufgabenpaket_id: aufgabenpaket_id,
          schuljahr_id: schuljahr_id
        });
      }

      // Alles erfolgreich - Commit
      await trx.commit();

      req.flash('success', ` Erfolgreich eine Challenge mit ${teams.length} Team(s) erstellt!`);
      res.redirect('/challenges');

    } catch (error) {
      // Bei Fehler - Rollbackö
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

// Challenge Detailansicht
router.get('/detail/:id', async (req, res) => {
  try {
    const challengeId = req.params.id;

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
        'schuljahre.name as schuljahr_name'
      )
      .first();

    if (!challenge) {
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }

    // Team-Mitglieder laden
    if (challenge.team_id) {
      const mitglieder = await db('team_mitglieder')
        .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
        .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
        .where('team_mitglieder.team_id', challenge.team_id)
        .where('users.user_role_id', 1)
        .select(
          'users.id',
          'users.vorname',
          'users.nachname',
          'klassen.name as klasse_name',
          'team_mitglieder.rolle'
        );

      challenge.team_mitglieder = mitglieder;
      challenge.team_mitglieder_names = mitglieder
        .map(m => `${m.vorname} ${m.nachname}`)
        .join(', ');
    }

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

// IN challenges.js - DIESE GET ROUTE KORRIGIEREN:
router.get('/:id/edit', async (req, res) => {
  try {
    const challengeId = req.params.id;

    // 1. ERST die Challenge ohne JOIN holen (um team_id zu sehen)
    const challenge = await db('challenges')
      .where('id', challengeId)
      .first();

    console.log(' RAW Challenge from DB:', {
      id: challenge.id,
      team_id: challenge.team_id,
      has_team: !!challenge.team_id
    });

    let existingTeams = [];

    // 2. NUR WENN team_id EXISTIERT
    if (challenge.team_id) {
      console.log(' Challenge hat Team ID:', challenge.team_id);

      // Team-Daten holen
      const team = await db('teams')
        .where('id', challenge.team_id)
        .first();

      console.log(' Team gefunden:', team ? team.name : 'NEIN');

      // Team-Mitglieder holen
      const teamMitglieder = await db('team_mitglieder')
        .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
        .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
        .where('team_mitglieder.team_id', challenge.team_id)
        .select(
          'team_mitglieder.user_id',
          'team_mitglieder.rolle',
          'users.vorname',
          'users.nachname',
          'klassen.name as klasse_name'
        );

      console.log(' Team Mitglieder:', teamMitglieder.length);

      // Existing Team erstellen (NUR wenn Team existiert)
      if (team) {
        existingTeams = [{
          id: 'existing-' + challenge.team_id,
          name: team.name,
          mitglieder: teamMitglieder.map(m => ({
            id: m.user_id,
            vorname: m.vorname,
            nachname: m.nachname,
            klasse: m.klasse_name,
            rolle: m.rolle
          }))
        }];

        console.log(' existingTeams erstellt:', existingTeams);
      }
    } else {
      console.log(' Challenge hat KEIN Team (team_id ist null/undefined)');
    }

    // 3. Debug-Ausgabe was an EJS gesendet wird
    console.log(' Sende an EJS Template:');
    console.log('- existingTeams:', existingTeams);
    console.log('- existingTeams Länge:', existingTeams.length);
    console.log('- existingTeams JSON:', JSON.stringify(existingTeams));

    // 4. Hole restliche Daten
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const schueler = await db('users')
      .where('user_role_id', 1)
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .select('users.*', 'klassen.name as klasse_name')
      .orderBy('users.nachname', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    // 5. RENDER mit KORREKTEN DATEN
    res.render('formChallenges', {
      item: {
        id: challenge.id,
        aufgabenpaket_id: challenge.aufgabenpaket_id,
        zusatzinfos: challenge.zusatzinfos,
        abgabedatum: challenge.abgabedatum,
        schuljahr_id: challenge.schuljahr_id,
        team_id: challenge.team_id
      },
      aufgabenpakete,
      schueler,
      schuljahre,
      existingTeam: existingTeams, //  Jetzt sollte es gefüllt sein
      action: `/challenges/${challenge.id}?_method=PUT`,
      title: 'Challenge bearbeiten',
      activePage: 'challenges'
    });

  } catch (error) {
    console.error(" FEHLER in GET /edit:", error);
    req.flash('error', 'Fehler beim Laden der Challenge: ' + error.message);
    res.redirect('/challenges');
  }
});

// PUT /:id - VOLLSTÄNDIG KORRIGIERT FÜR MEHRERE TEAMS
router.put('/:id', async (req, res) => {
  try {
    console.log(' PUT /challenges/' + req.params.id + ' - BEARBEITEN + NEUE TEAMS');

    const {
      aufgabenpaket_id,
      zusatzinfos,
      abgabedatum,
      schuljahr_id,
      teams_data
    } = req.body;

    // VALIDIERUNG
    if (!aufgabenpaket_id || !schuljahr_id) {
      req.flash('error', 'Aufgabenpaket und Schuljahr sind erforderlich.');
      return res.redirect(`/challenges/${req.params.id}/edit`);
    }

    // TRANSACTION
    const trx = await db.transaction();

    try {
      // 1. AKTUELLE CHALLENGE (Nur für Vorlage-Daten)
      const currentChallenge = await trx('challenges')
        .where({ id: req.params.id })
        .first();

      if (!currentChallenge) {
        await trx.rollback();
        req.flash('error', 'Challenge nicht gefunden.');
        return res.redirect('/challenges');
      }

      // 2. TEAMS-DATEN PARSEN
      let teams = [];
      if (teams_data && teams_data !== '[]' && teams_data !== '') {
        try {
          teams = JSON.parse(teams_data);
          console.log(` ${teams.length} Team(s) zum Verarbeiten`);
        } catch (e) {
          await trx.rollback();
          req.flash('error', 'Ungültige Team-Daten.');
          return res.redirect(`/challenges/${req.params.id}/edit`);
        }
      }

      // 3. AUFGABENPAKET HOLEN (Vorlage)
      const aufgabenpaket = await trx('aufgabenpakete')
        .where({ id: aufgabenpaket_id })
        .first();

      if (!aufgabenpaket) {
        await trx.rollback();
        req.flash('error', 'Aufgabenpaket nicht gefunden.');
        return res.redirect(`/challenges/${req.params.id}/edit`);
      }

      // 4. UNTERSCHEIDUNG: BESTEHENDE vs NEUE TEAMS
      const existingTeams = teams.filter(t => t.id && t.id.startsWith('existing-'));
      const newTeams = teams.filter(t => !t.id || !t.id.startsWith('existing-'));

      console.log(` ${existingTeams.length} bestehende, ${newTeams.length} neue Team(s)`);

      // 5.  BESTEHENDE TEAMS AKTUALISIEREN (nur das aktuelle!)
      for (const teamData of existingTeams) {
        const teamId = teamData.id.replace('existing-', '');

        // Nur das Team der aktuellen Challenge aktualisieren
        if (parseInt(teamId) === currentChallenge.team_id) {
          console.log(` Update Team der aktuellen Challenge: ${teamData.name}`);

          // Team-Name aktualisieren
          await trx('teams')
            .where({ id: teamId })
            .update({
              name: teamData.name,
              updated_at: db.fn.now()
            });

          // Alte Mitglieder löschen
          await trx('team_mitglieder')
            .where({ team_id: teamId })
            .del();

          // Neue Mitglieder einfügen
          if (teamData.mitglieder && teamData.mitglieder.length > 0) {
            const mitglieder = teamData.mitglieder.map((m, index) => ({
              team_id: teamId,
              user_id: m.id,
              rolle: index === 0 ? 'teamleiter' : 'mitglied'
            }));

            await trx('team_mitglieder').insert(mitglieder);
          }

          // Challenge-Daten aktualisieren
          await trx('challenges')
            .where({ id: req.params.id })
            .update({
              title: aufgabenpaket.title,
              beschreibung: aufgabenpaket.description,
              kategorie: aufgabenpaket.kategorie,
              icon: aufgabenpaket.icon,
              zusatzinfos: zusatzinfos || null,
              abgabedatum: abgabedatum || null,
              schuljahr_id: schuljahr_id,
              updated_at: db.fn.now()
            });
        }
      }

      // 6.  NEUE TEAMS HINZUFÜGEN (wie beim Erstellen!)
      for (const teamData of newTeams) {
        console.log(` Erstelle neues Team: ${teamData.name}`);

        // Neues Team erstellen
        const [newTeamId] = await trx('teams').insert({
          name: teamData.name || 'Neues Team',
          schuljahr_id: schuljahr_id,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });

        // Mitglieder einfügen
        if (teamData.mitglieder && teamData.mitglieder.length > 0) {
          const mitglieder = teamData.mitglieder.map((m, index) => ({
            team_id: newTeamId,
            user_id: m.id,
            rolle: index === 0 ? 'teamleiter' : 'mitglied'
          }));

          await trx('team_mitglieder').insert(mitglieder);
        }

        // NEUE CHALLENGE KOPIE erstellen (genau wie beim Erstellen!)
        await trx('challenges').insert({
          title: aufgabenpaket.title,
          beschreibung: aufgabenpaket.description,
          kategorie: aufgabenpaket.kategorie,
          icon: aufgabenpaket.icon,
          zusatzinfos: zusatzinfos || null,
          abgabedatum: abgabedatum || null,
          team_id: newTeamId,
          aufgabenpaket_id: aufgabenpaket_id,
          schuljahr_id: schuljahr_id,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });

        console.log(` Neue Challenge für Team ${teamData.name} erstellt`);
      }

      // 7. COMMIT
      await trx.commit();

      const message = newTeams.length > 0
        ? ` Challenge aktualisiert und ${newTeams.length} neue Team(s) hinzugefügt!`
        : ' Challenge aktualisiert.';

      req.flash('success', message);
      res.redirect('/challenges');

    } catch (error) {
      await trx.rollback();
      console.error(' Transaction Error:', error);
      req.flash('error', 'Fehler: ' + error.message);
      res.redirect(`/challenges/${req.params.id}/edit`);
    }

  } catch (error) {
    console.error(' Allgemeiner Fehler:', error);
    req.flash('error', 'Server-Fehler: ' + error.message);
    res.redirect(`/challenges/${req.params.id}/edit`);
  }
});

// In challenges.js - Testroute für Formulardaten
router.post('/test-form', async (req, res) => {
  console.log('Formular-Daten:', req.body);
  console.log('teams_data:', req.body.teams_data);
  res.json({
    message: 'Test erfolgreich',
    data: req.body
  });
});

// Challenge löschen
router.delete('/:id', async (req, res) => {
  try {
    const challengeId = parseInt(req.params.id);

    const trx = await db.transaction();

    try {
      const challenge = await trx('challenges').where({ id: challengeId }).first();

      if (!challenge) {
        await trx.rollback();
        req.flash('error', 'Challenge nicht gefunden.');
        return res.redirect('/challenges');
      }

      const teamId = challenge.team_id;

      await trx('challenges').where({ id: challengeId }).del();
      await trx('team_mitglieder').where({ team_id: teamId }).del();
      await trx('teams').where({ id: teamId }).del();

      await trx.commit();

      req.flash('success', ' Challenge und Team erfolgreich gelöscht.');
      res.redirect('/challenges');

    } catch (error) {
      await trx.rollback();
      throw error;
    }

  } catch (error) {
    console.error(' Fehler beim Löschen:', error);
    req.flash('error', 'Fehler beim Löschen: ' + error.message);
    res.redirect('/challenges');
  }
});


// Abgabe-Seite anzeigen - KORRIGIERT MIT MEDIEN-LADUNG
router.get('/:id/abgabe', async (req, res) => {
  try {
    const challengeId = req.params.id;

    // 1. Challenge-Daten laden
    const challenge = await req.db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('challenges.id', challengeId)
      .select(
        'challenges.*',
        'aufgabenpakete.title as aufgabenpaket_title',
        'aufgabenpakete.description as aufgabenpaket_description',
        'teams.name as team_name',
        'teams.id as team_id'
      )
      .first();

    if (!challenge) {
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }

    // 2. TEAM-Mitglieder laden
    const teamMitglieder = await req.db('team_mitglieder')
      .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .where('team_mitglieder.team_id', challenge.team_id)
      .select(
        'users.id',
        'users.vorname',
        'users.nachname',
        'klassen.name as klasse_name'
      );

    // 3. Abgabe-Daten laden (falls bereits existiert)
    let abgabe = await req.db('challenge_abgaben')
      .where({
        challenge_id: challengeId,
        team_id: challenge.team_id
      })
      .first();

    //  HIER WIRD DER MEDIEN-CODE EINGEFÜGT:
    if (abgabe) {
      const medien = await db('abgabe_medien')
        .where('abgabe_id', abgabe.id)
        .orderBy('reihenfolge', 'asc');

      // Füge die Medien zum Abgabe-Objekt hinzu
      abgabe.medien = medien;
    }
    //  ENDE MEDIEN-CODE

    // 4. HTML-Seite rendern
    res.render('abgabe', {
      title: 'Abgabe einreichen',
      challenge: challenge,
      team: {
        name: challenge.team_name,
        mitglieder: teamMitglieder
      },
      abgabe: abgabe || null, // Enthält jetzt abgabe.medien oder ist null
      daysLeft: 7, // Testwert
      currentUser: req.currentUser
    });

  } catch (error) {
    console.error('Fehler Abgabe-Seite:', error);
    req.flash('error', 'Fehler beim Laden der Abgabe-Seite.');
    res.redirect('/challenges');
  }
});


module.exports = router;