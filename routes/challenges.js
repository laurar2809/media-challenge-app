const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Challenges Übersicht - VOLLSTÄNDIG KORRIGIERT
router.get('/', async (req, res) => {
  try {
    const { kategorie, search, schuljahr } = req.query;
    
    // Basis Query mit korrekten Joins
    let query = db('challenges')
      .leftJoin('schuljahre', 'challenges.schuljahr_id', 'schuljahre.id')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id');

    // Filter nach Schuljahr
    if (schuljahr && schuljahr !== 'alle') {
      query = query.where('schuljahre.name', schuljahr);
    }

    // Filter nach Kategorie
    if (kategorie && kategorie !== 'alle') {
      query = query.where('aufgabenpakete.kategorie', kategorie);
    }

    // Suche
    if (search && search.length >= 2) {
      query = query.where(function() {
        this.where('aufgabenpakete.title', 'like', `%${search}%`)
             .orWhere('teams.name', 'like', `%${search}%`)
             .orWhere('aufgabenpakete.kategorie', 'like', `%${search}%`);
      });
    }

    // Challenges mit Basis-Daten laden
    const challenges = await query
      .select(
        'challenges.*',
        'aufgabenpakete.title as aufgabenpaket_title',
        'aufgabenpakete.kategorie',
        'aufgabenpakete.icon as aufgabenpaket_icon',
        'aufgabenpakete.description as aufgabenpaket_description',
        'teams.name as team_name',
        'schuljahre.name as schuljahr_name'
      )
      .orderBy('challenges.created_at', 'desc');

    // Team-Mitglieder für jede Challenge separat laden
    for (let challenge of challenges) {
      if (challenge.team_id) {
        const mitglieder = await db('team_mitglieder')
          .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
          .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
          .where('team_mitglieder.team_id', challenge.team_id)
          .where('users.user_role_id', 1) // Nur Schüler
          .select(
            'users.id',
            'users.vorname', 
            'users.nachname',
            'klassen.name as klasse_name'
          );
        
        challenge.team_mitglieder = mitglieder;
        challenge.team_mitglieder_names = mitglieder
          .map(m => `${m.vorname} ${m.nachname}`)
          .join(', ');
      } else {
        challenge.team_mitglieder = [];
        challenge.team_mitglieder_names = 'Kein Team';
      }
    }

    // Filter-Daten laden
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
    
    // Fehlerbehandlung
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

// Neue Challenge Formular - KORRIGIERTE VERSION
router.get('/new', async (req, res) => {
  try {
    console.log(' Lade Formular für neue Challenge...');
    
    // Alle benötigten Daten laden
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const schueler = await db('users')
      .where('user_role_id', 1) // Nur Schüler
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .select('users.*', 'klassen.name as klasse_name')
      .orderBy('users.nachname', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    console.log(' Daten geladen:', {
      aufgabenpakete: aufgabenpakete.length,
      schueler: schueler.length,
      schuljahre: schuljahre.length
    });

    res.render('formChallenges', {
      item: {},
      aufgabenpakete,
      teams: [], // Leere Teams-Liste
      schueler,
      schuljahre,
      existingTeam: [],
      action: '/challenges',
      title: 'Neue Challenge erstellen',
      activePage: 'challenges'
    });

  } catch (error) {
    console.error("❌ Fehler beim Laden des Formulars:", error);
    req.flash('error', 'Fehler beim Laden des Formulars: ' + error.message);
    res.redirect('/challenges');
  }
});


// Challenge Detailansicht - KORRIGIERT
router.get('/detail/:id', async (req, res) => {
  try {
    const challengeId = req.params.id;
    
    // Challenge mit allen Daten laden
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

// Weitere Routes bleiben gleich...
module.exports = router;