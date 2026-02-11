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
// HAUPTANSICHT: /challenges
router.get('/', requireAuth, async (req, res) => {
  try {
    const { kategorie, search, schuljahr } = req.query;
    const activeKategorie = kategorie || 'alle';
    const activeSchuljahr = schuljahr || 'alle';
    const searchTerm = search || '';

    // 1. ROLLENPRÜFUNG: SCHÜLER
    if (req.currentUser.user_role_id === 1) {
      console.log(`Lade Challenges für Schüler ${req.currentUser.vorname}`);

      // Finde das primäre Team des Schülers (wir nehmen das erste)
      const userTeamEntry = await req.db('team_mitglieder')
        .where('user_id', req.currentUser.id)
        .first();

      const userTeams = await req.db('team_mitglieder')
        .where('user_id', req.currentUser.id)
        .pluck('team_id');

      let challenges = [];
      if (userTeams.length > 0) {
        challenges = await req.db('challenges')
          .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
          .leftJoin('teams', 'challenges.team_id', 'teams.id')
          .leftJoin('challenge_abgaben', function () {
            this.on('challenges.id', '=', 'challenge_abgaben.challenge_id')
              // FIX: Hier nutzen wir die Team-ID des Schülers für den Join
              .andOn('challenge_abgaben.team_id', '=', req.db.raw('?', [userTeamEntry ? userTeamEntry.team_id : 0]))
          })
          .whereIn('challenges.team_id', userTeams)
          .select(
            'challenges.*',
            'aufgabenpakete.title as aufgabenpaket_title',
            'aufgabenpakete.kategorie',
            'teams.name as team_name',
            'challenge_abgaben.status as abgabe_status' // Das lädt den Status für das EJS
          )
          .orderBy('challenges.created_at', 'desc');
      }

      return res.render('schueler/challenges/challenges', {
        title: 'Meine Challenges',
        activePage: 'challenges',
        challenges: challenges,
        currentUser: req.currentUser
      });

    } else {
      // 2. ROLLENPRÜFUNG: LEHRER / ADMIN
      console.log(`Lade ALLE Challenges für Rolle: ${req.currentUser.user_role_id}`);

      // --- DATENBANK-WEICHE START ---
      const isSqlite = req.db.client.config.client === 'sqlite3' || req.db.client.config.client === 'better-sqlite3';

      // SQL-Syntax für Namen (SQLite nutzt ||, MySQL nutzt CONCAT)
      const nameExpression = isSqlite
        ? "m.vorname || ' ' || m.nachname"
        : "CONCAT(m.vorname, ' ', m.nachname)";

      // SQL-Syntax für Group_Concat (MySQL braucht SEPARATOR Wort, SQLite nicht)
      const groupConcatSql = isSqlite
        ? `GROUP_CONCAT(DISTINCT ${nameExpression})`
        : `GROUP_CONCAT(DISTINCT ${nameExpression} SEPARATOR ', ')`;
      // --- DATENBANK-WEICHE ENDE ---

      let challengesQuery = req.db('challenges')
        .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
        .leftJoin('teams', 'challenges.team_id', 'teams.id')
        .leftJoin('schuljahre', 'challenges.schuljahr_id', 'schuljahre.id')
        .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
        .leftJoin('users as m', 'team_mitglieder.user_id', 'm.id');

      // Filter anwenden (Nur filtern, wenn nicht 'alle' gewählt ist)
      if (activeSchuljahr !== 'alle') {
        challengesQuery = challengesQuery.where('schuljahre.name', activeSchuljahr);
      }

      // WICHTIG: Schuljahr-Fix für Lehrer (Falls Lehrer kein Schuljahr im Profil hat)
      if (req.currentUser.schuljahr_id && activeSchuljahr === 'alle') {
        // Optional: Lehrer sieht standardmäßig nur sein aktuelles Schuljahr
        // challengesQuery = challengesQuery.where('challenges.schuljahr_id', req.currentUser.schuljahr_id);
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

      const challenges = await challengesQuery
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'aufgabenpakete.icon as aufgabenpaket_icon',
          'teams.name as team_name',
          'schuljahre.name as schuljahr_name',
          // Hier wird jetzt die dynamische Weiche eingesetzt:
          req.db.raw(`${groupConcatSql} as team_mitglieder_names`)
        )
        .groupBy('challenges.id')
        .orderBy('challenges.created_at', 'desc');

      // Filter-Daten für die Dropdowns laden
      const [kategorien, schuljahre] = await Promise.all([
        req.db('categories').select('*').orderBy('title', 'asc'),
        req.db('schuljahre').orderBy('startjahr', 'desc')
      ]);

      return res.render('admin/challenges/challenges', {
        title: 'Challenges Übersicht',
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
    console.error('Challenges GET Fehler:', error);
    res.status(500).send('Server Fehler beim Laden der Challenges');
  }
});

// in challenges.js mit Rollencheck
router.get('/:id/detail', requireAuth, async (req, res) => {
  try {
    if (!req.currentUser || req.currentUser.user_role_id !== 1) {
      req.flash('error', 'Keine Berechtigung für diese Ansicht.');
      return res.redirect('/');
    }

    const userTeamEntry = await req.db('team_mitglieder')
      .where('user_id', req.currentUser.id)
      .first();

    const challenge = await req.db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .leftJoin('challenge_abgaben', function () {
        this.on('challenges.id', '=', 'challenge_abgaben.challenge_id')
          .andOn('challenge_abgaben.team_id', '=', req.db.raw('?', [userTeamEntry ? userTeamEntry.team_id : 0]))
      })
      .where('challenges.id', req.params.id)
      .select(
        'challenges.*',
        'aufgabenpakete.title as aufgabenpaket_title',
        'aufgabenpakete.description as aufgabenpaket_description',
        'aufgabenpakete.icon as aufgabenpaket_icon',
        'teams.name as team_name',
        'challenge_abgaben.status as abgabe_status'
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

    // In routes/challenges.js bei router.get('/new')
    const allTeams = await db('teams')
      .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
      .select('teams.id', 'teams.name')
      // DISTINCT sorgt dafür, dass jede Schüler-ID pro Team nur einmal im String landet
      .select(db.raw('GROUP_CONCAT(DISTINCT team_mitglieder.user_id) as mitglieder_ids'))
      .groupBy('teams.id', 'teams.name') // Das verhindert die doppelten Team-Namen!
      .orderBy('teams.name', 'asc');

    res.render('admin/challenges/challengesForm', {
      item: {},
      aufgabenpakete,
      teams: [], // Die Teams, die der Challenge aktuell zugeordnet sind (beim Erstellen leer)
      schueler,
      schuljahre,
      allTeams,     // <--- NEU: Alle Teams für die Auswahlbox
      existingTeams: [],
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


router.post('/', requireAuth, requireLehrer, async (req, res) => {
  try {
    const { aufgabenpaket_id, teams_data, zusatzinfos, abgabedatum, schuljahr_id } = req.body;

    // 1. Validierung
    if (!aufgabenpaket_id || !teams_data || !schuljahr_id) {
      req.flash('error', 'Aufgabenpaket, Teams und Schuljahr sind erforderlich.');
      return res.redirect('/challenges/new');
    }

    const teams = JSON.parse(teams_data);
    const aufgabenpaket = await db('aufgabenpakete').where({ id: aufgabenpaket_id }).first();

    const trx = await db.transaction();
    try {
      for (const teamData of teams) {
        let teamId;

        // CHECK: Ist es ein bestehendes Team? (ID beginnt mit 'existing-')
        if (teamData.id && String(teamData.id).startsWith('existing-')) {
          // Extrahiere die echte Datenbank-ID
          teamId = String(teamData.id).replace('existing-', '');

          // OPTIONAL: Hier werden KEINE neuen Mitglieder eingefügt, 
          // da das Team bereits in der DB existiert.
        }
        else {
          // NEUANLAGE: Nur wenn das Team im Modal komplett neu erstellt wurde
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

        // CHALLENGE ERSTELLEN: Für jedes Team eine eigene Zeile (deine Logik)
        await trx('challenges').insert({
          aufgabenpaket_id,
          team_id: teamId, // Verknüpft entweder die bestehende oder die neue ID
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
      throw error;
    }
  } catch (error) {
    console.error('Fehler beim Erstellen:', error);
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

    // In routes/challenges.js bei router.get('/:id/edit')
    const allTeams = await db('teams')
      .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
      .select('teams.id', 'teams.name')
      .select(db.raw("GROUP_CONCAT(DISTINCT team_mitglieder.user_id) as mitglieder_ids"))
      .groupBy('teams.id', 'teams.name') // Zwingt MySQL, jedes Team nur 1x auszugeben
      .orderBy('teams.name', 'asc');

    // In challenges.js -> GET /:id/edit
    let existingTeams = [];
    if (challenge.team_id) {
      const team = await db('teams').where('id', challenge.team_id).first();
      const teamMitglieder = await db('team_mitglieder')
        .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
        .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
        .where('team_mitglieder.team_id', challenge.team_id)
        .select(
          'users.id', // Wichtig: ID des Schülers
          'users.vorname',
          'users.nachname',
          'klassen.name as klasse_name'
        );

      if (team) {
        // Wir bauen das Objekt GENAU so, wie es das Frontend braucht
        existingTeams.push({
          id: 'existing-' + team.id,
          name: team.name,
          members: teamMitglieder // <--- WICHTIG: 'members' statt 'mitglieder'
        });
      }
    }

    // 4. Render mit allTeams
    res.render('admin/challenges/challengesForm', {
      item: challenge,
      aufgabenpakete,
      schueler,
      schuljahre,
      allTeams, // <--- Das wird für dein neues Dropdown gebraucht
      existingTeams: existingTeams,
      action: `/challenges/${challenge.id}`,
      title: 'Challenge bearbeiten',
      activePage: 'challenges'
    });

  } catch (error) {
    console.error("Fehler in GET /edit:", error);
    res.redirect('/challenges');
  }
});

router.put('/:id', requireAuth, requireLehrer, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const { aufgabenpaket_id, zusatzinfos, abgabedatum, schuljahr_id, teams_data } = req.body;

    const trx = await db.transaction();
    try {
      // 1. Die ursprüngliche Challenge laden, um zu wissen, welches Team sie hatte
      const originalChallenge = await trx('challenges').where({ id: challengeId }).first();

      // 2. Teams-Daten vom Frontend parsen
      let selectedTeams = JSON.parse(teams_data || '[]');

      // 3. ALLE Challenges löschen, die zum selben "Paket" gehören (optional)
      // ODER einfacher: Wir updaten die aktuelle und legen für neue Teams neue an.

      for (let i = 0; i < selectedTeams.length; i++) {
        const teamData = selectedTeams[i];
        let teamId;

        // A) Ist es ein bestehendes Team aus der Datenbank?
        if (teamData.id && String(teamData.id).startsWith('existing-')) {
          teamId = String(teamData.id).replace('existing-', '');

          // Wir updaten den Teamnamen, falls er im Modal geändert wurde
          await trx('teams').where({ id: teamId }).update({ name: teamData.name });

          // Mitglieder synchronisieren (Löschen & Neu setzen)
          await trx('team_mitglieder').where({ team_id: teamId }).del();
          if (teamData.members && teamData.members.length > 0) {
            const inserts = teamData.members.map((m, idx) => ({
              team_id: teamId,
              user_id: m.id,
              rolle: idx === 0 ? 'teamleiter' : 'mitglied'
            }));
            await trx('team_mitglieder').insert(inserts);
          }
        }
        // B) Ist es ein brandneues Team?
        else {
          const [newId] = await trx('teams').insert({
            name: teamData.name,
            created_at: db.fn.now()
          });
          teamId = newId;
          const inserts = teamData.members.map((m, idx) => ({
            team_id: teamId,
            user_id: m.id,
            rolle: idx === 0 ? 'teamleiter' : 'mitglied'
          }));
          await trx('team_mitglieder').insert(inserts);
        }

        // 4. CHALLENGE ZUORDNUNG
        if (i === 0) {
          // Das erste Team in der Liste überschreibt die aktuelle Challenge-ID
          await trx('challenges').where({ id: challengeId }).update({
            aufgabenpaket_id,
            team_id: teamId,
            schuljahr_id,
            zusatzinfos,
            abgabedatum,
            updated_at: db.fn.now()
          });
        } else {
          // Jedes weitere Team bekommt eine NEUE Challenge-Zeile (Kopie)
          const aufgabenpaket = await trx('aufgabenpakete').where({ id: aufgabenpaket_id }).first();
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
            created_at: db.fn.now()
          });
        }
      }

      await trx.commit();
      req.flash('success', 'Änderungen gespeichert!');
      res.redirect('/challenges');
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Fehler beim Bearbeiten:", error);
    res.status(500).send("Fehler beim Speichern");
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