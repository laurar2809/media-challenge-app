// routes/challenges.js - OHNE beschreibung
const express = require('express');
const router = express.Router();
const { db } = require('../db');

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
      query = query.where(function() {
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
      // Bei Fehler - Rollback
      await trx.rollback();
      console.error('❌ Datenbank-Fehler:', error);
      req.flash('error', 'Datenbank-Fehler: ' + error.message);
      res.redirect('/challenges/new');
    }
    
  } catch (error) {
    console.error('❌ Allgemeiner Fehler:', error);
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

// Challenge bearbeiten Formular - OHNE beschreibung
router.get('/:id/edit', async (req, res) => {
  try {
    const challenge = await db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('challenges.id', req.params.id)
      .first();
    
    if (!challenge) {
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }
    
    // Team-Mitglieder laden
    const teamMitglieder = await db('team_mitglieder')
      .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .where({ team_id: challenge.team_id })
      .select(
        'team_mitglieder.user_id',
        'team_mitglieder.rolle',
        'users.vorname',
        'users.nachname',
        'klassen.name as klasse_name'
      );
    
    // Team-Struktur für das Formular erstellen - OHNE beschreibung
    const existingTeam = {
      id: 'existing-team-1',
      name: challenge.team_name,
      mitglieder: teamMitglieder.map(m => ({
        id: m.user_id,
        vorname: m.vorname,
        nachname: m.nachname,
        klasse: m.klasse_name,
        rolle: m.rolle
      }))
    };
    
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const schueler = await db('users')
      .where('user_role_id', 1)
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .select('users.*', 'klassen.name as klasse_name')
      .orderBy('users.nachname', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');
    
    res.render('formChallenges', {
      item: {
        id: challenge.id,
        aufgabenpaket_id: challenge.aufgabenpaket_id,
        zusatzinfos: challenge.zusatzinfos,
        abgabedatum: challenge.abgabedatum,
        schuljahr_id: challenge.schuljahr_id,
        team_name: challenge.team_name,
        schueler_ids: teamMitglieder.map(m => m.user_id.toString())
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
    console.error("Fehler beim Laden der Challenge:", error);
    req.flash('error', 'Fehler beim Laden der Challenge.');
    res.redirect('/challenges');
  }
});

// Challenge aktualisieren - OHNE beschreibung
router.put('/:id', async (req, res) => {
  try {
    const { aufgabenpaket_id, zusatzinfos, abgabedatum, schuljahr_id, teams_data } = req.body;
    
    // Validierung
    if (!aufgabenpaket_id || !teams_data || !schuljahr_id) {
      req.flash('error', 'Aufgabenpaket, Teams und Schuljahr sind erforderlich.');
      return res.redirect(`/challenges/${req.params.id}/edit`);
    }

    let teams;
    try {
      teams = JSON.parse(teams_data);
    } catch (e) {
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
      const challenge = await trx('challenges').where({ id: req.params.id }).first();
      
      if (!challenge) {
        await trx.rollback();
        req.flash('error', 'Challenge nicht gefunden.');
        return res.redirect('/challenges');
      }

      // Team aktualisieren - NUR name
      await trx('teams').where({ id: challenge.team_id }).update({
        name: firstTeam.name
      });

      // Alte Team-Mitglieder löschen
      await trx('team_mitglieder').where({ team_id: challenge.team_id }).del();

      // Neue Team-Mitglieder hinzufügen
      const teamMitglieder = firstTeam.mitglieder.map((mitglied, index) => ({
        team_id: challenge.team_id,
        user_id: mitglied.id,
        rolle: index === 0 ? 'teamleiter' : 'mitglied'
      }));
      
      await trx('team_mitglieder').insert(teamMitglieder);

      // Challenge aktualisieren
      await trx('challenges').where({ id: req.params.id }).update({
        aufgabenpaket_id: aufgabenpaket_id,
        zusatzinfos: zusatzinfos || null,
        abgabedatum: abgabedatum || null,
        schuljahr_id: schuljahr_id
      });

      await trx.commit();

      req.flash('success', '✅ Challenge erfolgreich aktualisiert.');
      res.redirect('/challenges');
      
    } catch (error) {
      await trx.rollback();
      console.error('❌ Transaction Error:', error);
      req.flash('error', 'Fehler beim Aktualisieren: ' + error.message);
      res.redirect(`/challenges/${req.params.id}/edit`);
    }
    
  } catch (error) {
    console.error('❌ Allgemeiner Fehler:', error);
    req.flash('error', 'Fehler beim Aktualisieren: ' + error.message);
    res.redirect(`/challenges/${req.params.id}/edit`);
  }
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
      
      req.flash('success', '✅ Challenge und Team erfolgreich gelöscht.');
      res.redirect('/challenges');
      
    } catch (error) {
      await trx.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen:', error);
    req.flash('error', 'Fehler beim Löschen: ' + error.message);
    res.redirect('/challenges');
  }
});

module.exports = router;