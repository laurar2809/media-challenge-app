// routes/challenges.js - FINALE VEREINHEITLICHUNG UND ROLLENTRENNUNG

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireLehrer } = require('../middleware/auth');
const { deleteFile } = require('../utils/fileHandler');
const { deleteImageFile } = require('../utils/fileHandler'); // Sicherstellen, dass deleteFile/deleteImageFile verfügbar ist

// =========================================================
// HAUPTANSICHT: /challenges (Abgesichert für alle)
// =========================================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { kategorie, search, schuljahr } = req.query; // Filter-Parameter für Admin/Lehrer
    const activeKategorie = kategorie || 'alle';
    const activeSchuljahr = schuljahr || 'alle';
    const searchTerm = search || '';

    // 1. ROLLENPRÜFUNG
    if (req.currentUser.user_role_id === 1) {
      // ---------------------------------------------
      //  SCHÜLER ANSICHT (views/challenges/index.ejs)
      // ---------------------------------------------
      console.log(` Lade Challenges für Schüler ${req.currentUser.vorname}`);

      const userTeams = await req.db('team_mitglieder')
        .where('user_id', req.currentUser.id)
        .pluck('team_id');

      let challenges = [];
      if (userTeams.length > 0) {
        // Lade nur die Challenges, an denen der Schüler beteiligt ist
        challenges = await req.db('challenges')
          .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
          .leftJoin('teams', 'challenges.team_id', 'teams.id')
          .whereIn('challenges.team_id', userTeams)
          .select(
            'challenges.*',
            'aufgabenpakete.title as aufgabenpaket_title',
            'aufgabenpakete.kategorie', // Für das EJS-Template
            'teams.name as team_name'
          )
          .orderBy('challenges.created_at', 'desc');
      }

      //  RENDER SCHÜLER-TEMPLATE: Dieses Template braucht KEINE Filter-Arrays
      return res.render('schueler/challenges/challenges', {
        title: 'Challenges',
        activePage: 'challenges',
        challenges: challenges,
        currentUser: req.currentUser
      });

    } else {
      // ---------------------------------------------
      //  LEHRER/ADMIN ANSICHT (views/challenges.ejs)
      // ---------------------------------------------
      console.log(` Lade ALLE Challenges für ${req.currentUser.rolle}`);

      let challengesQuery = req.db('challenges')
        .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
        .leftJoin('teams', 'challenges.team_id', 'teams.id')
        .leftJoin('schuljahre', 'challenges.schuljahr_id', 'schuljahre.id');

      // 1. Filtern der Hauptabfrage
      if (activeSchuljahr !== 'alle') {
        challengesQuery = challengesQuery.where('schuljahre.name', activeSchuljahr);
      }
      if (activeKategorie !== 'alle') {
        challengesQuery = challengesQuery.where('aufgabenpakete.kategorie', activeKategorie);
      }
      if (searchTerm && searchTerm.length >= 2) {
        const searchLower = searchTerm.toLowerCase();
        challengesQuery = challengesQuery.where(function () {
          this.where('aufgabenpakete.title', 'like', `%${searchLower}%`)
            .orWhere('teams.name', 'like', `%${searchLower}%`);
        });
      }

      const challengesRaw = await challengesQuery
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'aufgabenpakete.icon as aufgabenpaket_icon',
          'teams.name as team_name',
          'schuljahre.name as schuljahr_name'
        )
        .orderBy('challenges.created_at', 'desc');

      // 2. Team-Mitglieder für jede Challenge laden (Promise.all)
      const challenges = await Promise.all(
        challengesRaw.map(async (challenge) => {
          if (challenge.team_id) {
            const mitglieder = await req.db('team_mitglieder')
              .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
              .where('team_mitglieder.team_id', challenge.team_id)
              .select('users.vorname', 'users.nachname');

            challenge.team_mitglieder_names = mitglieder.map(m => `${m.vorname} ${m.nachname}`).join(', ');
          } else {
            challenge.team_mitglieder_names = 'Kein Team';
          }
          return challenge;
        })
      );

      // 3. Hole Filter-Daten
      const [kategorien, schuljahre] = await Promise.all([
        req.db('categories').select('*').orderBy('title', 'asc'),
        req.db('schuljahre').orderBy('startjahr', 'desc')
      ]);

      //  RENDER ADMIN/LEHRER-TEMPLATE: Dieses Template braucht alle Filter-Arrays
      return res.render('admin/challenges/challenges', {
        title: 'Challenges',
        activePage: 'challenges',
        challenges,
        kategorien,
        schuljahre,
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


// in challenges.js mit Rollencheck
router.get('/:id/detail', requireAuth, async (req, res) => {
  try {
    if (!req.currentUser || req.currentUser.user_role_id !== 1) {
      req.flash('error', 'Keine Berechtigung für diese Ansicht.');
      return res.redirect('/');
    }

    const challenge = await req.db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('challenges.id', req.params.id)
      .select(
        'challenges.*',
        'aufgabenpakete.title as aufgabenpaket_title',
        'aufgabenpakete.description as aufgabenpaket_description',
        'aufgabenpakete.icon as aufgabenpaket_icon',
        'teams.name as team_name'
      )
      .first();

    if (!challenge) {
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }

    const returnTo = req.query.returnTo || '/challenges';

    let teamMitglieder = [];
    if (challenge.team_id) {
      teamMitglieder = await req.db('team_mitglieder')
        .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
        .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
        .where('team_mitglieder.team_id', challenge.team_id)
        .select(
          'users.vorname',
          'users.nachname',
          'klassen.name as klasse_name'
        );
    }

    res.render('schueler/challenges/challengesDetail', {
      title: 'Challenge-Details',
      challenge,
      teamMitglieder,
      activePage: 'challenges',
      returnTo
    });
  } catch (error) {
    console.error('Fehler in Schüler-Challenge-Detail:', error);
    req.flash('error', 'Fehler beim Laden der Challenge-Details.');
    res.redirect('/challenges');
  }
});



// Neue Challenge Formular
router.get('/new', requireAuth, requireLehrer, async (req, res) => {
  try {
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');

    const schueler = await db('users')
      .where('user_role_id', 1)
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .select('users.*', 'klassen.name as klasse_name')
      .orderBy('users.nachname', 'asc');

    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    // In routes/challenges.js bei router.get('/new') und router.get('/:id/edit')
    const allTeams = await db('teams')
      .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
      .select('teams.id', 'teams.name')
      // Zieht alle IDs der Mitglieder in einen kommaseparierten String zusammen
      .select(db.raw('GROUP_CONCAT(team_mitglieder.user_id) as mitglieder_ids'))
      .groupBy('teams.id')
      .orderBy('teams.name', 'asc');


    res.render('admin/challenges/challengesForm', {
      item: {},
      aufgabenpakete,
      teams: [], // Die Teams, die der Challenge aktuell zugeordnet sind (beim Erstellen leer)
      schueler,
      schuljahre,
      allTeams,     // <--- NEU: Alle Teams für die Auswahlbox
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


// Challenge speichern - KORRIGIERTE VERSION
router.post('/', requireAuth, requireLehrer, async (req, res) => {
  try {
    const { aufgabenpaket_id, teams_data, zusatzinfos, abgabedatum, schuljahr_id } = req.body;

    // 1. Validierung
    if (!aufgabenpaket_id || !teams_data || !schuljahr_id) {
      req.flash('error', 'Aufgabenpaket, Teams und Schuljahr sind erforderlich.');
      return res.redirect('/challenges/new');
    }

    // 2. JSON-Daten parsen
    let teams;
    try {
      teams = JSON.parse(teams_data);
    } catch (e) {
      console.error('JSON Parse Fehler:', e);
      req.flash('error', 'Ungültige Team-Daten.');
      return res.redirect('/challenges/new');
    }

    // 3. Aufgabenpaket als Vorlage laden
    const aufgabenpaket = await db('aufgabenpakete').where({ id: aufgabenpaket_id }).first();
    if (!aufgabenpaket) {
      req.flash('error', 'Ausgewähltes Aufgabenpaket nicht gefunden.');
      return res.redirect('/challenges/new');
    }

    const trx = await db.transaction();
    try {
      for (const teamData of teams) {
        let teamId;

        // DEBUG: Was kommt hier an?
        console.log("--- Verarbeite Team-Daten ---");
        console.log("ID vom Frontend:", teamData.id);
        console.log("Typ von ID:", typeof teamData.id);
        console.log("Name:", teamData.name);

        // Der ultimative Check:
        const isExisting = teamData.id && String(teamData.id).includes('existing-');
        console.log("Wird als 'existing' erkannt?", isExisting);

        if (isExisting) {
          teamId = String(teamData.id).replace('existing-', '');
          console.log("Extrahierte Team-ID für DB:", teamId);
          // HIER DARF KEIN INSERT STEHEN
        }
        else {
          console.log("WIRD NEU ANGELEGT!");
          const [newId] = await trx('teams').insert({
            name: teamData.name,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
          teamId = newId;

          const teamMitglieder = (teamData.members || []).map((m, i) => ({
            team_id: teamId,
            user_id: m.id,
            rolle: i === 0 ? 'teamleiter' : 'mitglied'
          }));

          if (teamMitglieder.length > 0) {
            await trx('team_mitglieder').insert(teamMitglieder);
          }
        }


        // Challenge erstellen (für JEDES Team eine, aber mit der richtigen teamId)
        await trx('challenges').insert({
          aufgabenpaket_id,
          team_id: teamId,
          schuljahr_id,
          zusatzinfos,
          abgabedatum,
          title: aufgabenpaket.title,
          beschreibung: aufgabenpaket.description,
          kategorie: aufgabenpaket.kategorie,
          icon: aufgabenpaket.icon,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }

      await trx.commit();
      req.flash('success', `${teams.length} Challenge(s) erfolgreich erstellt.`);
      res.redirect('/challenges');
    } catch (error) {
      await trx.rollback();
      throw error; // Springt in den äußeren catch-Block
    }

  } catch (error) {
    console.error('Datenbank-Fehler beim Erstellen der Challenge:', error);
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

    res.render('admin/challenges/challengesDetail', {
      challenge: challenge,
      activePage: 'challenges'
    });

  } catch (error) {
    console.error('Fehler beim Laden der Challenge-Details:', error);
    req.flash('error', 'Fehler beim Laden der Challenge-Details.');
    res.redirect('/challenges');
  }
});

router.get('/:id/edit', requireAuth, requireLehrer, async (req, res) => {
  try {
    const challengeId = req.params.id;

    // 1. Die Challenge laden
    const challenge = await db('challenges').where('id', challengeId).first();
    if (!challenge) {
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }

    // 2. Alle Daten für die Dropdowns laden
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const schueler = await db('users')
      .where('user_role_id', 1)
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .select('users.*', 'klassen.name as klasse_name')
      .orderBy('users.nachname', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    // --- WICHTIG: Das hier muss rein, damit das Dropdown funktioniert ---
    const allTeams = await db('teams').select('*').orderBy('name', 'asc');

    // 3. Bestehende Team-Daten für die Badges aufbereiten
    let existingTeams = [];
    if (challenge.team_id) {
      const team = await db('teams').where('id', challenge.team_id).first();
      const teamMitglieder = await db('team_mitglieder')
        .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
        .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
        .where('team_mitglieder.team_id', challenge.team_id)
        .select('team_mitglieder.user_id', 'team_mitglieder.rolle', 'users.vorname', 'users.nachname', 'klassen.name as klasse_name');

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
      }
    }

    // 4. Render mit allTeams
    res.render('admin/challenges/challengesForm', {
      item: challenge,
      aufgabenpakete,
      schueler,
      schuljahre,
      allTeams, // <--- Das wird für dein neues Dropdown gebraucht
      existingTeam: existingTeams,
      action: `/challenges/${challenge.id}`,
      title: 'Challenge bearbeiten',
      activePage: 'challenges'
    });

  } catch (error) {
    console.error("Fehler in GET /edit:", error);
    res.redirect('/challenges');
  }
});

// PUT /:id - VOLLSTÄNDIG KORRIGIERT FÜR MEHRERE TEAMS
router.put('/:id', requireAuth, requireLehrer, async (req, res) => {
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

      // 5.  BESTEHENDE TEAMS AKTUALISIEREN
      for (const teamData of existingTeams) {
        const teamId = teamData.id.replace('existing-', '');

        //  HIER IST DIE WICHTIGE PRÜFUNG: Nur das Team der aktuellen Challenge aktualisieren
        if (parseInt(teamId) === currentChallenge.team_id) {
          console.log(` Update Team der aktuellen Challenge: ${teamData.name}`);

          // Team-Name aktualisieren
          await trx('teams')
            .where({ id: teamId })
            .update({
              name: teamData.name, //  Aktualisierter Team-Name
              updated_at: db.fn.now()
            });

          // Team-Mitglieder aktualisieren (ALT löschen, NEU einfügen)

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

          // Challenge-Daten aktualisieren (bleibt unverändert)
          await trx('challenges')
            .where({ id: req.params.id })
            // ... (restliche Challenge-Updates) ...
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
        } else {
          console.log(` Überspringe Update für nicht-zugehöriges Team-Element: ${teamId}`);
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

// DELETE /challenges/:id (Challenge löschen)
router.delete('/:id', requireAuth, requireLehrer, async (req, res) => {
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

    // 1. Abgaben finden, um deren Medienpfade zu erhalten
    const abgaben = await trx('challenge_abgaben')
      .where('challenge_id', challengeId)
      .select('id');

    const abgabeIds = abgaben.map(a => a.id);

    // 2. Mediendateien und DB-Einträge der Abgaben löschen
    if (abgabeIds.length > 0) {
      // Finde ALLE Medienpfade VOR dem Löschen der DB-Referenzen
      const mediaPaths = await trx('abgabe_medien')
        .whereIn('abgabe_id', abgabeIds)
        .pluck('datei_pfad'); // Verwende den Pfad, den Sie in abgabe_medien speichern

      //  LÖSCHEN DER DATEIEN VOM DATEISYSTEM
      mediaPaths.forEach(path => deleteFile(path));

      // DB-Einträge der Abgaben und Abhängigkeiten löschen
      await trx('abgabe_bewertungen').whereIn('abgabe_id', abgabeIds).del();
      await trx('abgabe_medien').whereIn('abgabe_id', abgabeIds).del();
      await trx('challenge_abgaben').where('challenge_id', challengeId).del();
    }



    // 4. Team-Einträge löschen, aber NUR wenn das Team nur von DIESER Challenge genutzt wird
    if (teamId) {
      const teamChallengesCount = await trx('challenges').where('team_id', teamId).count('id as count').first();

      if (teamChallengesCount.count <= 1) {
        // Nur diese Challenge referenziert das Team -> Team und Mitglieder löschen
        await trx('team_mitglieder').where({ team_id: teamId }).del();
        await trx('teams').where({ id: teamId }).del();
      }
    }

    // 5. Challenge selbst löschen
    await trx('challenges').where({ id: challengeId }).del();

    // Transaktion abschließen
    await trx.commit();
    req.flash('success', ` Challenge ${challengeId} und alle zugehörigen Daten erfolgreich und sauber gelöscht.`);
    res.redirect('/challenges');

  } catch (error) {
    await trx.rollback();
    console.error(' Fehler beim Löschen der Challenge:', error);

    let errorMessage = 'Fehler beim Löschen aufgetreten.';
    if (error.code === 'SQLITE_CONSTRAINT' || error.errno === 1451) {
      errorMessage = 'Fehler: Challenge enthält noch unbekannte Abhängigkeiten.';
    }

    req.flash('error', errorMessage);
    res.redirect('/challenges');
  }
});

// Abgabe-Seite anzeigen - mit Medien & dynamischem Zurück-Link
router.get('/:id/abgabe', requireAuth, async (req, res) => {
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

    // Medien laden
    if (abgabe) {
      const medien = await db('abgabe_medien')
        .where('abgabe_id', abgabe.id)
        .orderBy('reihenfolge', 'asc');

      abgabe.medien = medien;
    }

    // Bewertungsinformationen laden
    if (abgabe) {
      const bewertung = await db('abgabe_bewertungen')
        .where('abgabe_id', abgabe.id)
        .first();

      abgabe.bewertung = bewertung || null;
    }

    // 4. Ziel für "Zurück"-Button bestimmen
    const returnTo = req.query.returnTo || `/challenges/${challengeId}/detail`;

    // 5. HTML-Seite rendern
    res.render('schueler/challenges/abgabe', {
      title: 'Abgabe einreichen',
      challenge: challenge,
      team: {
        name: challenge.team_name,
        mitglieder: teamMitglieder
      },
      abgabe: abgabe || null, // enthält ggf. medien & bewertung
      daysLeft: 7, // Testwert
      currentUser: req.currentUser,
      returnTo
    });

  } catch (error) {
    console.error('Fehler Abgabe-Seite:', error);
    req.flash('error', 'Fehler beim Laden der Abgabe-Seite.');
    res.redirect('/challenges');
  }
});



module.exports = router;